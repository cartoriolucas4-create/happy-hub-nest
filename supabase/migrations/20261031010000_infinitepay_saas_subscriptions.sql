create table if not exists public.subscription_orders (
 id uuid primary key default gen_random_uuid(), order_nsu text not null unique,
 user_id uuid not null references auth.users(id) on delete cascade,
 barbershop_id uuid not null references public.barbershops(id) on delete cascade,
 plan text not null check(plan in ('mensal','semestral','anual')),
 amount_cents integer not null check(amount_cents in (5999,23994,29999)),
 duration_months integer not null check(duration_months in (1,6,12)),
 status text not null default 'pending' check(status in ('pending','paid','held','canceled','failed')),
 checkout_url text, invoice_slug text, transaction_nsu text, receipt_url text, provider_payload jsonb,
 paid_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists subscription_orders_owner_created_idx on public.subscription_orders(user_id,created_at desc);
alter table public.subscription_orders enable row level security;
drop policy if exists "Owners can read own subscription orders" on public.subscription_orders;
create policy "Owners can read own subscription orders" on public.subscription_orders for select to authenticated using(user_id=auth.uid());
revoke insert,update,delete on public.subscription_orders from anon,authenticated;
grant select on public.subscription_orders to authenticated;
create or replace function public.confirm_infinitepay_subscription(p_order_nsu text,p_invoice_slug text,p_transaction_nsu text,p_receipt_url text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.subscription_orders%rowtype; l public.access_licenses%rowtype; v_start timestamptz; v_end timestamptz; v_now timestamptz:=now();
begin
 select * into o from public.subscription_orders where order_nsu=p_order_nsu for update;
 if not found then return jsonb_build_object('ok',false,'reason','order_not_found'); end if;
 if o.status in ('paid','held') then return jsonb_build_object('ok',true,'duplicate',true,'status',o.status); end if;
 if o.status<>'pending' or p_invoice_slug is null or p_transaction_nsu is null then return jsonb_build_object('ok',false,'reason','invalid_order_state'); end if;
 select * into l from public.access_licenses where user_id=o.user_id and barbershop_id=o.barbershop_id for update;
 if not found then return jsonb_build_object('ok',false,'reason','license_not_found'); end if;
 if l.status in ('blocked','suspended') then
  update public.subscription_orders set status='held',invoice_slug=p_invoice_slug,transaction_nsu=p_transaction_nsu,receipt_url=p_receipt_url,provider_payload=p_payload,paid_at=v_now,updated_at=v_now where id=o.id;
  insert into public.access_history(user_id,barbershop_id,acao,observacao,novo_prazo,novo_vencimento) values(o.user_id,o.barbershop_id,'pagamento_recebido_pendente','InfinitePay confirmou pagamento; licença bloqueada/suspensa, exige análise administrativa.',o.plan,l.access_expires_at);
  return jsonb_build_object('ok',true,'status','held');
 end if;
 v_start:=greatest(v_now,coalesce(l.access_expires_at,v_now)); v_end:=v_start+make_interval(months=>o.duration_months);
 update public.access_licenses set status='active',access_type='paid_access',access_started_at=v_start,access_expires_at=v_end,observacao='Assinatura InfinitePay: '||o.plan,updated_at=v_now where id=l.id;
 update public.barbershops set plano=o.plan,assinatura_status='active',assinatura_vencimento=v_end where id=o.barbershop_id;
 update public.subscription_orders set status='paid',invoice_slug=p_invoice_slug,transaction_nsu=p_transaction_nsu,receipt_url=p_receipt_url,provider_payload=p_payload,paid_at=v_now,updated_at=v_now where id=o.id;
 insert into public.access_history(user_id,barbershop_id,acao,observacao,novo_prazo,novo_vencimento,vencimento_anterior) values(o.user_id,o.barbershop_id,'assinatura_infinitepay','Pagamento confirmado pela InfinitePay. Pedido '||o.order_nsu,o.plan,v_end,l.access_expires_at);
 return jsonb_build_object('ok',true,'status','paid','expires_at',v_end);
end; $$;
revoke all on function public.confirm_infinitepay_subscription(text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.confirm_infinitepay_subscription(text,text,text,text,jsonb) to service_role;