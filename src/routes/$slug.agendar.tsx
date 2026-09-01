import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Check, Clock3, Copy, MessageCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { brDate, brl, hhmm, isPhone, todayIso, addDays, waLink, mensagemAgendamento } from "@/lib/barber";
import { WhatsAppFloat } from "@/components/public/WhatsAppFloat";
import { criarCheckoutMercadoPago, mercadoPagoPublicStatus, statusPagamentoMercadoPago } from "@/lib/mercado-pago";

export const Route = createFileRoute("/$slug/agendar")({
  head: ({ params }) => ({ meta: [
    { title: `Agendar horário online | ${params.slug}` },
    { name: "description", content: "Escolha serviço, profissional, data e horário e confirme seu agendamento online." },
    { property: "og:title", content: `Agendar horário | ${params.slug}` },
    { property: "og:description", content: "Agendamento online rápido, 24 horas por dia." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Agendar,
});

const inputCls = "w-full rounded-md border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary";
type BusinessHour = { dia_semana: number; aberto: boolean; hora_inicio: string | null; hora_fim: string | null; intervalo_inicio: string | null; intervalo_fim: string | null };
type PaymentMethod = { id: string; name: string; description: string | null; icon: string | null; pix_key: string | null; pix_beneficiary: string | null };
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
function diaSemana(iso: string) { return new Date(`${iso}T12:00:00`).getDay(); }
function horaValida(h: BusinessHour) { return Boolean(h.aberto && h.hora_inicio && h.hora_fim && h.hora_fim > h.hora_inicio); }
function formatarTelefone(value: string) { const digits = value.replace(/\D/g, "").slice(0, 11); if (digits.length <= 2) return digits.length ? `(${digits}` : ""; if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`; return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`; }
function isPix(name: string) { return name.trim().toLowerCase() === "pix"; }

function Agendar() {
  const { slug } = Route.useParams();
  const queryParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const paymentReturn = queryParams.get("payment");
  const returnedAppointmentId = queryParams.get("appointment");
  const [step, setStep] = useState(paymentReturn && returnedAppointmentId ? 7 : 1);
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [data, setData] = useState(todayIso());
  const [hora, setHora] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [pagamentoOnline, setPagamentoOnline] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [whatsUrl, setWhatsUrl] = useState("");

  const { data: base, isLoading } = useQuery({ queryKey: ["agendar-base", slug], queryFn: async () => {
    const shop = await supabase.from("barbershops").select("*").eq("slug", slug).maybeSingle();
    if (shop.error) throw shop.error;
    if (!shop.data) return null;
    const [services, barbers, links, businessHours] = await Promise.all([
      supabase.from("services").select("*").eq("barbershop_id", shop.data.id).eq("ativo", true).order("preco"),
      supabase.from("barbers").select("*").eq("barbershop_id", shop.data.id).eq("ativo", true).order("nome"),
      supabase.from("barber_services").select("barber_id, service_id").eq("barbershop_id", shop.data.id),
      supabase.from("business_hours").select("dia_semana, aberto, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim").eq("barbershop_id", shop.data.id).order("dia_semana"),
    ]);
    if (businessHours.error) throw businessHours.error;
    return { shop: shop.data, services: services.data ?? [], barbers: barbers.data ?? [], links: links.data ?? [], businessHours: (businessHours.data ?? []) as BusinessHour[] };
  } });

  const { data: metodos = [] } = useQuery({ queryKey: ["payment-methods", base?.shop.id], enabled: Boolean(base?.shop.id), queryFn: async () => {
    const { data, error } = await supabase.from("payment_methods").select("*").eq("barbershop_id", base!.shop.id).eq("active", true).order("display_order");
    if (error) throw error;
    return (data ?? []) as unknown as PaymentMethod[];
  } });
  const { data: mpPublic } = useQuery({ queryKey: ["mercado-pago-public", slug], queryFn: () => mercadoPagoPublicStatus(slug), retry: false });
  const { data: returnedPayment } = useQuery({ queryKey: ["mercado-pago-return", returnedAppointmentId], enabled: Boolean(returnedAppointmentId), queryFn: () => statusPagamentoMercadoPago(returnedAppointmentId!), refetchInterval: paymentReturn === "pending" ? 3000 : false, retry: false });

  useEffect(() => {
    if (!base) return;
    const firstOpen = Array.from({ length: 61 }, (_, i) => addDays(todayIso(), i)).find((iso) => { const h = base.businessHours.find((item) => item.dia_semana === diaSemana(iso)); return Boolean(h && horaValida(h)); });
    const current = base.businessHours.find((h) => h.dia_semana === diaSemana(data));
    if (firstOpen && !horaValida(current ?? { dia_semana: -1, aberto: false, hora_inicio: null, hora_fim: null, intervalo_inicio: null, intervalo_fim: null })) { setData(firstOpen); setHora(""); }
  }, [base]);

  const metodo = metodos.find((m) => m.id === paymentMethodId);
  const servico = base?.services.find((s) => s.id === serviceId);
  const barbeiro = base?.barbers.find((b) => b.id === barberId);
  const vinculosDoServico = (base?.links ?? []).filter((l) => l.service_id === serviceId);
  const barbeirosDoServico = (base?.barbers ?? []).filter((b) => vinculosDoServico.length === 0 || vinculosDoServico.some((l) => l.barber_id === b.id));
  const horarioDoDia = base?.businessHours.find((h) => h.dia_semana === diaSemana(data));
  const semana = Array.from({ length: 7 }, (_, i) => { const iso = addDays(todayIso(), i); const h = base?.businessHours.find((item) => item.dia_semana === diaSemana(iso)); return { iso, dia: diaSemana(iso), nome: DIAS[diaSemana(iso)], horario: h }; });

  const { data: horarios, isFetching: buscandoHorarios, isError: erroAoBuscarHorarios, refetch: recarregarHorarios } = useQuery({ queryKey: ["horarios-publicos", slug, barberId, serviceId, data], enabled: step === 3 && Boolean(barberId && serviceId && data), queryFn: async () => {
    const { data: res, error } = await supabase.rpc("horarios_disponiveis", { p_slug: slug, p_barber_id: barberId, p_service_id: serviceId, p_data: data });
    if (error) throw error;
    return res ?? [];
  } });

  function selecionarData(novaData: string) { setData(novaData); setHora(""); }
  function validarDados() { if (nome.trim().length < 3) return "Informe seu nome completo."; if (!isPhone(telefone)) return "Informe um telefone válido com DDD."; return null; }
  function validarPagamento() { if (pagamentoOnline) return null; if (metodos.length === 0) return null; if (!paymentMethodId) return "Escolha um método de pagamento."; return null; }
  async function copiarPix() { if (!metodo?.pix_key) return; try { await navigator.clipboard.writeText(metodo.pix_key); toast.success("Chave Pix copiada!"); } catch { toast.error("Não foi possível copiar automaticamente."); } }

  const confirmar = useMutation({
    mutationFn: async () => {
      const erro = validarDados() ?? validarPagamento();
      if (erro) throw new Error(erro);
      if (pagamentoOnline) {
        if (!mpPublic?.connected) throw new Error("O pagamento online ainda não está disponível para esta barbearia.");
        const checkout = await criarCheckoutMercadoPago({ slug, barberId, serviceId, data, hora, nome: nome.trim(), telefone: telefone.trim(), observacao: observacao.trim() });
        return { checkoutUrl: checkout.checkoutUrl, whatsUrl: "" };
      }
      const { error } = await supabase.rpc("criar_agendamento_publico", { p_slug: slug, p_barber_id: barberId, p_service_id: serviceId, p_data: data, p_hora: hora, p_nome: nome.trim(), p_telefone: telefone.trim(), ...(paymentMethodId ? { p_payment_method_id: paymentMethodId } : {}), ...(observacao.trim() ? { p_observacao: observacao.trim() } : {}) });
      if (error) throw new Error(error.message);
      return { checkoutUrl: "", whatsUrl: waLink(base!.shop, mensagemAgendamento({ barbearia: base!.shop.nome, cliente: nome.trim(), telefoneCliente: telefone.trim(), servico: servico?.nome ?? "", barbeiro: barbeiro?.nome ?? "", data, hora, duracao: servico?.duracao_minutos ?? 0, valor: servico?.preco ?? 0, ...(metodo ? { pagamento: metodo.name } : {}), observacao })) };
    },
    onSuccess: ({ checkoutUrl, whatsUrl: url }) => { if (checkoutUrl) { window.location.assign(checkoutUrl); return; } setWhatsUrl(url); setStep(7); if (url) window.open(url, "_blank", "noopener,noreferrer"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Centro>Carregando...</Centro>;
  if (!base) return <Centro><h1 className="text-3xl">Barbearia não encontrada.</h1><Link to="/" className="mt-4 inline-block text-primary underline">Voltar ao início</Link></Centro>;

  const resumo: [string, string][] = [["Barbearia", base.shop.nome], ["Serviço", servico?.nome ?? ""], ["Barbeiro", barbeiro?.nome ?? ""], ["Data", brDate(data)], ["Horário", hora], ["Duração", `${servico?.duracao_minutos ?? 0} minutos`], ["Valor", brl(servico?.preco ?? 0)], ["Cliente", nome.trim()], ["WhatsApp", telefone.trim()], ...(pagamentoOnline ? [["Pagamento", "Mercado Pago"] as [string, string]] : metodo ? [["Forma de pagamento", metodo.name] as [string, string]] : []), ...(observacao.trim() ? [["Observação", observacao.trim()] as [string, string]] : [])];

  if (step === 7 && paymentReturn) {
    const aprovado = returnedPayment?.status === "approved" || paymentReturn === "success";
    const falhou = ["rejected", "cancelled", "refunded", "charged_back"].includes(returnedPayment?.status ?? "") || paymentReturn === "failure";
    return <Centro><Check className={`mx-auto h-12 w-12 ${aprovado ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" /><h1 className="mt-6 text-4xl">{aprovado ? "Pagamento aprovado!" : falhou ? "Pagamento não aprovado" : "Pagamento em processamento"}</h1><p className="mx-auto mt-4 max-w-md text-muted-foreground">{aprovado ? "Seu agendamento foi confirmado. Você já pode retornar para a barbearia." : falhou ? "O pagamento não foi concluído. Você pode tentar novamente." : "Estamos aguardando a confirmação do Mercado Pago. Esta página será atualizada automaticamente."}</p><div className="mt-8 flex flex-col gap-3"><Link to="/$slug" params={{ slug }} className="rounded-sm border border-border px-6 py-3 text-sm hover:border-primary hover:text-primary">Voltar para a barbearia</Link><Link to="/$slug/agendar" params={{ slug }} className="rounded-sm bg-primary px-6 py-3 text-sm text-primary-foreground">Novo agendamento</Link></div></Centro>;
  }

  if (step === 7) return <Centro><Check className="mx-auto h-12 w-12 text-primary" aria-hidden="true" /><h1 className="mt-6 text-4xl">Agendamento confirmado!</h1><div className="mx-auto mt-8 max-w-md rounded-lg border border-border bg-card p-6 text-left text-sm">{resumo.map(([k, v]) => <p key={k} className="flex justify-between gap-4 border-b border-border/60 py-1.5 last:border-0"><span className="text-muted-foreground">{k}</span><span className="text-right">{v}</span></p>)}</div>{metodo && isPix(metodo.name) && metodo.pix_key && <div className="mx-auto mt-5 max-w-md rounded-lg border border-primary/30 bg-primary/5 p-5 text-left"><p className="text-xs uppercase tracking-widest text-primary">Pagamento via Pix</p><p className="mt-2 text-sm"><span className="text-muted-foreground">Beneficiário:</span> {metodo.pix_beneficiary || "Não informado"}</p><div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3"><span className="min-w-0 break-all text-sm">{metodo.pix_key}</span><button type="button" onClick={copiarPix} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary px-3 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"><Copy className="h-3.5 w-3.5" />Copiar chave</button></div></div>}{whatsUrl && <a href={whatsUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-sm bg-emerald-500 px-6 py-3 font-display tracking-widest text-white hover:bg-emerald-600"><MessageCircle className="h-5 w-5" /> ENVIAR NO WHATSAPP</a>}<div><Link to="/$slug" params={{ slug }} className="mt-6 inline-block rounded-sm border border-border px-6 py-3 text-sm hover:border-primary hover:text-primary">Voltar para a barbearia</Link></div></Centro>;

  return <div className="min-h-screen bg-background px-5 py-10 text-foreground"><div className="mx-auto max-w-xl"><Link to="/$slug" params={{ slug }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> {base.shop.nome}</Link><div className="mt-6 flex gap-2">{[1, 2, 3, 4, 5, 6].map((n) => <div key={n} className={`h-1 flex-1 rounded ${n <= step ? "bg-primary" : "bg-secondary"}`} />)}</div>

  {step === 1 && <section className="mt-8"><h1 className="text-3xl">Escolha o serviço</h1><div className="mt-6 space-y-3">{base.services.length === 0 && <p className="text-muted-foreground">Esta barbearia ainda não cadastrou serviços.</p>}{base.services.map((s) => <button key={s.id} onClick={() => { setServiceId(s.id); setBarberId(""); setStep(2); }} className="flex w-full items-center justify-between rounded-lg border border-border bg-card p-4 text-left hover:border-primary"><span><span className="text-lg">{s.nome}</span><span className="block text-sm text-muted-foreground">{s.duracao_minutos} min</span></span><span className="font-display text-xl text-primary">{brl(s.preco)}</span></button>)}</div></section>}
  {step === 2 && <section className="mt-8"><h1 className="text-3xl">Escolha o profissional</h1><div className="mt-6 space-y-3">{barbeirosDoServico.length === 0 && <p className="text-muted-foreground">Nenhum profissional disponível para este serviço.</p>}{barbeirosDoServico.map((b) => <button key={b.id} onClick={() => { setBarberId(b.id); setStep(3); }} className="flex w-full items-center gap-4 rounded-lg border border-border bg-card p-4 text-left hover:border-primary"><span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-secondary font-display text-xl text-primary">{b.foto_url ? <img src={b.foto_url} alt={b.nome} className="h-full w-full object-cover" /> : b.nome.slice(0, 1)}</span><span><span className="text-lg">{b.nome}</span>{b.descricao && <span className="block text-sm text-muted-foreground">{b.descricao}</span>}</span></button>)}</div><button className="mt-6 text-sm text-muted-foreground underline" onClick={() => setStep(1)}>Voltar</button></section>}
  {step === 3 && <section className="mt-8"><h1 className="text-3xl">Data e horário</h1><p className="mt-2 text-sm text-muted-foreground">Escolha um dia que esteja aberto. Os horários abaixo respeitam a abertura e o fechamento cadastrados pela barbearia.</p><div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-2">{semana.map((item) => { const aberto = horaValida(item.horario ?? { dia_semana: item.dia, aberto: false, hora_inicio: null, hora_fim: null, intervalo_inicio: null, intervalo_fim: null }); const selecionado = item.iso === data; return <button key={item.iso} type="button" disabled={!aberto} onClick={() => selecionarData(item.iso)} className={`min-w-0 rounded-lg border px-1 py-3 text-center transition ${selecionado ? "border-primary bg-primary/15 text-primary" : aberto ? "border-border bg-card hover:border-primary" : "cursor-not-allowed border-border/50 bg-secondary/30 opacity-40"}`}><span className="block truncate text-[10px] uppercase tracking-wider">{(item.nome ?? "").slice(0, 3)}</span><span className="mt-1 block text-lg font-semibold">{item.iso.slice(8, 10)}</span></button>; })}</div><input type="date" className={`${inputCls} mt-4`} min={todayIso()} max={addDays(todayIso(), 60)} value={data} onChange={(e) => selecionarData(e.target.value)} />{horarioDoDia && horaValida(horarioDoDia) && <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Horário de funcionamento</p><p className="mt-1 text-lg font-medium text-primary">{hhmm(horarioDoDia.hora_inicio!)} às {hhmm(horarioDoDia.hora_fim!)}</p>{horarioDoDia.intervalo_inicio && horarioDoDia.intervalo_fim && <p className="mt-1 text-xs text-muted-foreground">Intervalo: {hhmm(horarioDoDia.intervalo_inicio)} às {hhmm(horarioDoDia.intervalo_fim)}</p>}</div>}{!base.businessHours.some(horaValida) && <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-muted-foreground">A barbearia ainda não cadastrou dias e horários de funcionamento.</p>}<div className="mt-5 rounded-lg border border-border bg-card/40 p-4"><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" aria-hidden="true" /><h2 className="text-base font-semibold">Horários disponíveis</h2></div><p className="mt-1 text-xs text-muted-foreground">Selecione um horário livre para continuar.</p></div>{!buscandoHorarios && !erroAoBuscarHorarios && (horarios ?? []).length > 0 && <span className="text-xs text-muted-foreground">{(horarios ?? []).length} disponível{(horarios ?? []).length === 1 ? "" : "eis"}</span>}</div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{buscandoHorarios && <div className="col-span-full flex items-center gap-2 py-3 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4 animate-pulse" /> Carregando horários disponíveis...</div>}{!buscandoHorarios && erroAoBuscarHorarios && <div className="col-span-full rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Não foi possível carregar os horários.</div><button type="button" onClick={() => recarregarHorarios()} className="mt-2 text-xs underline hover:text-primary">Tentar novamente</button></div>}{!buscandoHorarios && !erroAoBuscarHorarios && (horarios ?? []).length === 0 && <div className="col-span-full flex items-center gap-2 py-3 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" /> Não há horários livres nesta data.</div>}{!buscandoHorarios && !erroAoBuscarHorarios && (horarios ?? []).map((h) => <button key={`${h.barber_id}-${h.hora}`} type="button" onClick={() => { setHora(hhmm(h.hora)); setStep(4); }} className="rounded-md border border-border bg-card px-4 py-3 text-center font-display text-lg transition hover:border-primary hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50">{hhmm(h.hora)}</button>)}</div></div><button className="mt-6 text-sm text-muted-foreground underline" onClick={() => setStep(2)}>Voltar</button></section>}
  {step === 4 && <section className="mt-8"><h1 className="text-3xl">Seus dados</h1><p className="mt-2 text-sm text-muted-foreground">{servico?.nome} · {brDate(data)} às {hora} · {brl(servico?.preco ?? 0)}</p><form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); const erro = validarDados(); if (erro) { toast.error(erro); return; } setStep(5); }}><input className={`${inputCls} uppercase`} placeholder="Nome completo" maxLength={120} value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} required /><input className={inputCls} placeholder="Telefone / WhatsApp" type="tel" inputMode="numeric" maxLength={15} value={telefone} onChange={(e) => setTelefone(formatarTelefone(e.target.value))} required /><textarea className={`${inputCls} uppercase`} rows={3} maxLength={500} placeholder="Observação (opcional)" value={observacao} onChange={(e) => setObservacao(e.target.value.toUpperCase())} /><button className="w-full rounded-md bg-primary py-3 font-display text-lg tracking-widest text-primary-foreground hover:bg-primary/90">CONTINUAR</button></form><button className="mt-6 text-sm text-muted-foreground underline" onClick={() => setStep(3)}>Voltar</button></section>}
  {step === 5 && <section className="mt-8"><h1 className="text-3xl">Como você pretende pagar?</h1><p className="mt-2 text-sm text-muted-foreground">Selecione uma forma de pagamento.</p><div className="mt-6 space-y-3">{mpPublic?.connected && <button type="button" onClick={() => { setPagamentoOnline(true); setPaymentMethodId(""); }} className={`flex w-full items-center gap-3 rounded-lg border bg-card p-4 text-left ${pagamentoOnline ? "border-primary" : "border-border"}`}><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${pagamentoOnline ? "border-primary" : "border-muted-foreground"}`}>{pagamentoOnline && <span className="h-2 w-2 rounded-full bg-primary" />}</span><CreditCard className="h-5 w-5 text-primary" /><span><span className="block text-lg">Pagar online</span><span className="block text-sm text-muted-foreground">Mercado Pago · Pix e cartão</span></span></button>}{metodos.length === 0 && !mpPublic?.connected && <p className="text-sm text-muted-foreground">Esta barbearia ainda não cadastrou meios de pagamento. Combine o pagamento diretamente com ela.</p>}{metodos.map((m) => <div key={m.id} className={`rounded-lg border bg-card ${!pagamentoOnline && paymentMethodId === m.id ? "border-primary" : "border-border"}`}><button type="button" onClick={() => { setPagamentoOnline(false); setPaymentMethodId(m.id); }} className="flex w-full items-center gap-3 p-4 text-left"><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${!pagamentoOnline && paymentMethodId === m.id ? "border-primary" : "border-muted-foreground"}`}>{!pagamentoOnline && paymentMethodId === m.id && <span className="h-2 w-2 rounded-full bg-primary" />}</span><span><span className="text-lg">{m.icon ? `${m.icon} ` : ""}{m.name}</span>{m.description && <span className="block text-sm text-muted-foreground">{m.description}</span>}</span></button>{!pagamentoOnline && paymentMethodId === m.id && isPix(m.name) && <div className="border-t border-primary/20 bg-primary/5 p-4"><p className="text-xs uppercase tracking-widest text-primary">Pagamento via Pix</p><p className="mt-2 text-sm"><span className="text-muted-foreground">Beneficiário:</span> {m.pix_beneficiary || "Não informado"}</p>{m.pix_key ? <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3"><span className="min-w-0 break-all text-sm">{m.pix_key}</span><button type="button" onClick={copiarPix} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary px-3 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"><Copy className="h-3.5 w-3.5" />Copiar chave</button></div> : <p className="mt-3 text-xs text-muted-foreground">A chave Pix ainda não foi cadastrada pela barbearia.</p>}</div>}</div>)}</div><button onClick={() => { const erro = validarPagamento(); if (erro) { toast.error(erro); return; } setStep(6); }} className="mt-6 w-full rounded-md bg-primary py-3 font-display text-lg tracking-widest text-primary-foreground hover:bg-primary/90">REVISAR AGENDAMENTO</button><button className="mt-6 text-sm text-muted-foreground underline" onClick={() => setStep(4)}>Voltar</button></section>}
  {step === 6 && <section className="mt-8"><h1 className="text-3xl">Confira seu agendamento</h1><div className="mt-6 rounded-lg border border-border bg-card p-6 text-sm">{resumo.map(([k, v]) => <p key={k} className="flex justify-between gap-4 border-b border-border/60 py-2 last:border-0"><span className="text-muted-foreground">{k}</span><span className="text-right">{v}</span></p>)}</div>{pagamentoOnline && <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-4"><p className="text-xs uppercase tracking-widest text-primary">Pagamento online</p><p className="mt-2 text-sm">Você será levado ao Mercado Pago para concluir o pagamento.</p><p className="mt-2 text-xs text-muted-foreground">Taxa da plataforma: R$ 0,49 por transação.</p></div>}{!pagamentoOnline && metodo && isPix(metodo.name) && metodo.pix_key && <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-4"><p className="text-xs uppercase tracking-widest text-primary">Pix</p><p className="mt-2 text-sm">Beneficiário: <strong>{metodo.pix_beneficiary || "Não informado"}</strong></p><div className="mt-2 flex items-center justify-between gap-3"><span className="break-all text-sm">{metodo.pix_key}</span><button type="button" onClick={copiarPix} className="inline-flex shrink-0 items-center gap-1 text-primary hover:underline"><Copy className="h-4 w-4" />Copiar</button></div></div>}<button disabled={confirmar.isPending} onClick={() => confirmar.mutate()} className="mt-6 w-full rounded-md bg-primary py-4 font-display text-lg tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{confirmar.isPending ? (pagamentoOnline ? "CRIANDO CHECKOUT..." : "CONFIRMANDO...") : pagamentoOnline ? "PAGAR COM MERCADO PAGO" : "CONFIRMAR AGENDAMENTO"}</button><p className="mt-3 text-center text-xs text-muted-foreground">{pagamentoOnline ? "O agendamento será confirmado após a aprovação do pagamento." : "Ao confirmar, abriremos o WhatsApp da barbearia com o resumo do seu agendamento."}</p><button className="mt-6 text-sm text-muted-foreground underline" onClick={() => setStep(5)}>Voltar</button></section>}
  </div><WhatsAppFloat shop={base.shop} /></div>;
}

function Centro({ children }: { children: React.ReactNode }) { return <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center text-foreground"><div>{children}</div></div>; }
