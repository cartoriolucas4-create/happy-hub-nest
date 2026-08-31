import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Plus, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DIAS, hhmm } from "@/lib/barber";
import { useSetupStatus } from "@/lib/setup";
import { btn, btnGhost, input } from "./AdminShell";

const emptyService = { nome: "", descricao: "", preco: "", duracao_minutos: "", ativo: true };
const emptyBarber = { nome: "", telefone: "", descricao: "", foto_url: "", ativo: true, servicos: [] as string[] };
const emptyPayment = { name: "", description: "", icon: "", active: true };

type HourRow = { dia_semana: number; aberto: boolean; hora_inicio: string; hora_fim: string; intervalo_inicio: string; intervalo_fim: string };

export function SetupWizard({ shopId }: { shopId: string }) {
  const qc = useQueryClient();
  const { data: status } = useSetupStatus(shopId);
  const [step, setStep] = useState(1);
  const [service, setService] = useState(emptyService);
  const [barber, setBarber] = useState(emptyBarber);
  const [payment, setPayment] = useState(emptyPayment);
  const [days, setDays] = useState<number[]>([]);
  const [hours, setHours] = useState<HourRow[]>([]);

  const { data: current } = useQuery({
    queryKey: ["setup-wizard-data", shopId],
    enabled: Boolean(shopId),
    queryFn: async () => {
      const [services, barbers, bh, payments] = await Promise.all([
        supabase.from("services").select("id,nome,descricao,preco,duracao_minutos,ativo").eq("barbershop_id", shopId).order("nome"),
        supabase.from("barbers").select("id,nome,telefone,descricao,foto_url,ativo").eq("barbershop_id", shopId).order("nome"),
        supabase.from("business_hours").select("*").eq("barbershop_id", shopId).order("dia_semana"),
        supabase.from("payment_methods").select("id,name,description,icon,active,display_order").eq("barbershop_id", shopId).order("display_order"),
      ]);
      if (services.error) throw services.error;
      if (barbers.error) throw barbers.error;
      if (bh.error) throw bh.error;
      if (payments.error) throw payments.error;
      return { services: services.data ?? [], barbers: barbers.data ?? [], bh: bh.data ?? [], payments: payments.data ?? [] };
    },
  });

  const setInitialHours = () => {
    const selected = new Set(days);
    setHours(
      DIAS.map((_, i) => {
        const row = current?.bh.find((r) => r.dia_semana === i);
        return {
          dia_semana: i,
          aberto: selected.has(i),
          hora_inicio: row?.aberto ? hhmm(row.hora_inicio) : "",
          hora_fim: row?.aberto ? hhmm(row.hora_fim) : "",
          intervalo_inicio: row?.aberto ? hhmm(row.intervalo_inicio) : "",
          intervalo_fim: row?.aberto ? hhmm(row.intervalo_fim) : "",
        };
      }).filter((r) => r.aberto),
    );
  };

  async function addService() {
    const preco = Number(service.preco.replace(",", "."));
    const duracao = Number(service.duracao_minutos);
    if (service.nome.trim().length < 2 || !Number.isFinite(preco) || preco < 0 || !Number.isFinite(duracao) || duracao < 5) {
      toast.error("Preencha nome, preço e duração válidos.");
      return;
    }
    const { error } = await supabase.from("services").insert({ barbershop_id: shopId, nome: service.nome.trim(), descricao: service.descricao.trim() || null, preco, duracao_minutos: duracao, ativo: true });
    if (error) { toast.error(error.message); return; }
    setService(emptyService);
    await qc.invalidateQueries({ queryKey: ["setup-wizard-data", shopId] });
    await qc.invalidateQueries({ queryKey: ["setup-status", shopId] });
    toast.success("Serviço cadastrado.");
  }

  async function addBarber() {
    if (barber.nome.trim().length < 2) { toast.error("Informe o nome do profissional."); return; }
    const { data: created, error } = await supabase.from("barbers").insert({ barbershop_id: shopId, nome: barber.nome.trim(), telefone: barber.telefone.trim() || null, descricao: barber.descricao.trim() || null, foto_url: barber.foto_url.trim() || null, ativo: true }).select("id").single();
    if (error || !created) { toast.error(error?.message ?? "Não foi possível cadastrar o profissional."); return; }
    if (barber.servicos.length) {
      const { error: linkError } = await supabase.from("barber_services").insert(barber.servicos.map((service_id) => ({ barbershop_id: shopId, barber_id: created.id, service_id })));
      if (linkError) { toast.error(linkError.message); return; }
    }
    setBarber(emptyBarber);
    await qc.invalidateQueries({ queryKey: ["setup-wizard-data", shopId] });
    await qc.invalidateQueries({ queryKey: ["setup-status", shopId] });
    toast.success("Profissional cadastrado.");
  }

  async function saveDaysAndHours() {
    if (!days.length) { toast.error("Selecione pelo menos um dia."); return; }
    if (!hours.length) setInitialHours();
    const rows = hours.length ? hours : DIAS.map((_, i) => ({ dia_semana: i, aberto: days.includes(i), hora_inicio: "", hora_fim: "", intervalo_inicio: "", intervalo_fim: "" })).filter((r) => r.aberto);
    if (rows.some((r) => !r.hora_inicio || !r.hora_fim || r.hora_fim <= r.hora_inicio)) { toast.error("Informe horários válidos para todos os dias selecionados."); return; }
    const existing = current?.bh ?? [];
    for (const row of existing) {
      const shouldOpen = days.includes(row.dia_semana);
      const next = { aberto: shouldOpen } as { aberto: boolean; hora_inicio?: string; hora_fim?: string; intervalo_inicio?: string | null; intervalo_fim?: string | null };
      if (shouldOpen) {
        const edited = rows.find((r) => r.dia_semana === row.dia_semana);
        if (!edited) continue;
        Object.assign(next, { hora_inicio: edited.hora_inicio, hora_fim: edited.hora_fim, intervalo_inicio: edited.intervalo_inicio || null, intervalo_fim: edited.intervalo_fim || null });
      }
      const { error } = await supabase.from("business_hours").update(next).eq("id", row.id);
      if (error) { toast.error(error.message); return; }
    }
    for (const row of rows.filter((r) => !existing.some((e) => e.dia_semana === r.dia_semana))) {
      const { error } = await supabase.from("business_hours").insert({ barbershop_id: shopId, dia_semana: row.dia_semana, aberto: true, hora_inicio: row.hora_inicio, hora_fim: row.hora_fim, intervalo_inicio: row.intervalo_inicio || null, intervalo_fim: row.intervalo_fim || null });
      if (error) { toast.error(error.message); return; }
    }
    await qc.invalidateQueries({ queryKey: ["setup-wizard-data", shopId] });
    await qc.invalidateQueries({ queryKey: ["setup-status", shopId] });
    toast.success("Dias e horários salvos.");
  }

  async function addPayment() {
    if (payment.name.trim().length < 2) { toast.error("Informe o meio de pagamento."); return; }
    const ordem = current?.payments.length ? Math.max(...current.payments.map((p) => p.display_order)) + 1 : 0;
    const { error } = await supabase.from("payment_methods").insert({ barbershop_id: shopId, name: payment.name.trim(), description: payment.description.trim() || null, icon: payment.icon.trim() || null, active: true, display_order: ordem });
    if (error) { toast.error(error.message); return; }
    setPayment(emptyPayment);
    await qc.invalidateQueries({ queryKey: ["setup-wizard-data", shopId] });
    await qc.invalidateQueries({ queryKey: ["setup-status", shopId] });
    toast.success("Meio de pagamento cadastrado.");
  }

  async function finish() {
    await qc.invalidateQueries({ queryKey: ["setup-status", shopId] });
    const fresh = await qc.fetchQuery({ queryKey: ["setup-status", shopId] });
    if (!fresh.completo) { toast.error("Ainda existem etapas pendentes."); return; }
    toast.success("Sua barbearia está configurada!");
  }

  const done = status?.itens ?? [];
  const completed = done.filter((i) => i.ok).length;
  const labels = ["Serviço", "Profissional", "Dias", "Horários", "Pagamento"];
  const ok = (key: string) => Boolean(done.find((i) => i.key === key)?.ok);

  return (
    <div className="max-w-3xl rounded-xl border border-primary/30 bg-card p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs uppercase tracking-[0.25em] text-primary">Configuração inicial</p><h2 className="mt-2 text-2xl sm:text-3xl">Configure sua barbearia</h2><p className="mt-2 text-sm text-muted-foreground">Complete os dados reais do seu atendimento para colocar o site no ar.</p></div>
        <div className="shrink-0 text-right text-xs text-muted-foreground">{completed} de 5</div>
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full bg-primary transition-all" style={{ width: `${completed * 20}%` }} /></div>
      <div className="mt-6 grid grid-cols-5 gap-2">{labels.map((label, i) => <button key={label} type="button" onClick={() => setStep(i + 1)} className={`rounded-md border px-2 py-2 text-[11px] ${step === i + 1 ? "border-primary text-primary" : ok(["servicos","barbeiros","dias","horarios","pagamentos"][i]!) ? "border-emerald-500/30 text-emerald-400" : "border-border text-muted-foreground"}`}>{ok(["servicos","barbeiros","dias","horarios","pagamentos"][i]!) ? "✓ " : ""}{label}</button>)}</div>

      {step === 1 && <section className="mt-8"><h3 className="text-xl">Cadastre seu primeiro serviço</h3><p className="mt-1 text-sm text-muted-foreground">Use o cadastro real de serviços: nome, preço e duração. Nada é preenchido automaticamente.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><input className={input} placeholder="Nome do serviço" value={service.nome} onChange={(e) => setService({ ...service, nome: e.target.value })} /><input className={input} placeholder="Preço (R$)" value={service.preco} onChange={(e) => setService({ ...service, preco: e.target.value })} /><input className={input} placeholder="Descrição (opcional)" value={service.descricao} onChange={(e) => setService({ ...service, descricao: e.target.value })} /><input className={input} type="number" min={5} max={480} step={5} placeholder="Duração (min)" value={service.duracao_minutos} onChange={(e) => setService({ ...service, duracao_minutos: e.target.value })} /></div><div className="mt-5 flex gap-2"><button className={btn} onClick={addService}><Plus className="mr-2 inline h-4 w-4" />Cadastrar serviço</button><button className={btnGhost} onClick={() => setStep(2)}>Continuar</button></div><ExistingList title="Serviços cadastrados" items={(current?.services ?? []).map((s) => `${s.nome} · R$ ${Number(s.preco).toFixed(2)} · ${s.duracao_minutos} min`)} /></section>}

      {step === 2 && <section className="mt-8"><h3 className="text-xl">Cadastre seu primeiro profissional</h3><div className="mt-5 grid gap-3 sm:grid-cols-2"><input className={input} placeholder="Nome do profissional" value={barber.nome} onChange={(e) => setBarber({ ...barber, nome: e.target.value })} /><input className={input} placeholder="Telefone (opcional)" value={barber.telefone} onChange={(e) => setBarber({ ...barber, telefone: e.target.value })} /><input className={input} placeholder="Especialidade (opcional)" value={barber.descricao} onChange={(e) => setBarber({ ...barber, descricao: e.target.value })} /><input className={input} placeholder="URL da foto (opcional)" value={barber.foto_url} onChange={(e) => setBarber({ ...barber, foto_url: e.target.value })} /></div><div className="mt-4 flex flex-wrap gap-2">{(current?.services ?? []).map((s) => { const selected = barber.servicos.includes(s.id); return <button key={s.id} type="button" onClick={() => setBarber({ ...barber, servicos: selected ? barber.servicos.filter((id) => id !== s.id) : [...barber.servicos, s.id] })} className={`rounded-full border px-3 py-1.5 text-sm ${selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{s.nome}</button>; })}</div><div className="mt-5 flex gap-2"><button className={btn} onClick={addBarber}><Plus className="mr-2 inline h-4 w-4" />Cadastrar profissional</button><button className={btnGhost} onClick={() => setStep(3)}>Continuar</button></div><ExistingList title="Profissionais cadastrados" items={(current?.barbers ?? []).map((b) => b.nome)} /></section>}

      {step === 3 && <section className="mt-8"><h3 className="text-xl">Quais dias sua barbearia atende?</h3><div className="mt-5 grid gap-2 sm:grid-cols-2">{DIAS.map((d, i) => { const selected = days.includes(i) || Boolean(current?.bh.find((r) => r.dia_semana === i && r.aberto)); return <button key={d} type="button" onClick={() => setDays((old) => selected ? old.filter((x) => x !== i) : [...old, i])} className={`flex items-center gap-3 rounded-md border p-3 text-left ${selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}><span>{selected ? "☑" : "☐"}</span>{d}</button>; })}</div><div className="mt-5 flex gap-2"><button className={btn} onClick={() => { const next = days.length ? days : (current?.bh ?? []).filter((r) => r.aberto).map((r) => r.dia_semana); setDays(next); setHours([]); setStep(4); setTimeout(setInitialHours, 0); }}>Continuar</button></div></section>}

      {step === 4 && <section className="mt-8"><h3 className="text-xl">Defina seus horários de atendimento</h3><p className="mt-1 text-sm text-muted-foreground">Todos os dias selecionados precisam ter horário válido.</p><div className="mt-5 space-y-3">{(hours.length ? hours : (current?.bh ?? []).filter((r) => r.aberto).map((r) => ({ dia_semana: r.dia_semana, aberto: true, hora_inicio: hhmm(r.hora_inicio), hora_fim: hhmm(r.hora_fim), intervalo_inicio: hhmm(r.intervalo_inicio), intervalo_fim: hhmm(r.intervalo_fim) }))).map((h) => <div key={h.dia_semana} className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-5"><div className="flex items-center font-medium sm:col-span-1">{DIAS[h.dia_semana]}</div><input type="time" className={input} value={h.hora_inicio} onChange={(e) => setHours((old) => (old.length ? old : (current?.bh ?? []).filter((r) => r.aberto).map((r) => ({ dia_semana: r.dia_semana, aberto: true, hora_inicio: hhmm(r.hora_inicio), hora_fim: hhmm(r.hora_fim), intervalo_inicio: hhmm(r.intervalo_inicio), intervalo_fim: hhmm(r.intervalo_fim) }))).map((x) => x.dia_semana === h.dia_semana ? { ...x, hora_inicio: e.target.value } : x)))} /><input type="time" className={input} value={h.hora_fim} onChange={(e) => setHours((old) => (old.length ? old : (current?.bh ?? []).filter((r) => r.aberto).map((r) => ({ dia_semana: r.dia_semana, aberto: true, hora_inicio: hhmm(r.hora_inicio), hora_fim: hhmm(r.hora_fim), intervalo_inicio: hhmm(r.intervalo_inicio), intervalo_fim: hhmm(r.intervalo_fim) }))).map((x) => x.dia_semana === h.dia_semana ? { ...x, hora_fim: e.target.value } : x)))} /><input type="time" className={input} value={h.intervalo_inicio} onChange={(e) => setHours((old) => (old.length ? old : []).map((x) => x.dia_semana === h.dia_semana ? { ...x, intervalo_inicio: e.target.value } : x))} /><input type="time" className={input} value={h.intervalo_fim} onChange={(e) => setHours((old) => (old.length ? old : []).map((x) => x.dia_semana === h.dia_semana ? { ...x, intervalo_fim: e.target.value } : x))} /></div>)}</div><div className="mt-5 flex gap-2"><button className={btn} onClick={async () => { await saveDaysAndHours(); setStep(5); }}>Salvar e continuar</button></div></section>}

      {step === 5 && <section className="mt-8"><h3 className="text-xl">Como seus clientes podem pagar?</h3><p className="mt-1 text-sm text-muted-foreground">Nenhum meio é escolhido automaticamente.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><input className={input} placeholder="Meio de pagamento" value={payment.name} onChange={(e) => setPayment({ ...payment, name: e.target.value })} /><input className={input} placeholder="Descrição (opcional)" value={payment.description} onChange={(e) => setPayment({ ...payment, description: e.target.value })} /><input className={input} placeholder="Ícone (opcional)" value={payment.icon} onChange={(e) => setPayment({ ...payment, icon: e.target.value })} /></div><div className="mt-5 flex gap-2"><button className={btn} onClick={addPayment}><Plus className="mr-2 inline h-4 w-4" />Cadastrar pagamento</button><button className={btnGhost} onClick={finish}>Finalizar</button></div><ExistingList title="Meios cadastrados" items={(current?.payments ?? []).map((p) => p.name)} /></section>}

      {status?.completo && <div className="mt-8 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5"><div className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /><div><h3 className="font-display text-sm tracking-widest">SUA BARBEARIA ESTÁ CONFIGURADA!</h3><p className="mt-1 text-sm text-muted-foreground">Todos os requisitos reais foram atendidos. Seu Meu Link pode ser usado normalmente.</p></div></div><button className={`${btn} mt-5`} onClick={() => window.location.assign("/admin/meu-link")}>Ver meu link</button></div>}
      <div className="mt-7 flex items-center justify-between border-t border-border pt-5"><button className={btnGhost} disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}><ChevronLeft className="mr-1 inline h-4 w-4" />Voltar</button>{step < 5 && <button className={btnGhost} onClick={() => setStep((s) => Math.min(5, s + 1))}>Continuar<ChevronRight className="ml-1 inline h-4 w-4" /></button>}</div>
    </div>
  );
}

function ExistingList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <div className="mt-6 rounded-md border border-border bg-background/30 p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">{title}</p><ul className="mt-2 space-y-1 text-sm">{items.map((item, i) => <li key={`${item}-${i}`} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" />{item}</li>)}</ul></div>;
}
