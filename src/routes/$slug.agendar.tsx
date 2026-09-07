import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { brDate, brl, hhmm, isPhone, todayIso, addDays, waLink, mensagemAgendamento } from "@/lib/barber";
import { WhatsAppFloat } from "@/components/public/WhatsAppFloat";

export const Route = createFileRoute("/$slug/agendar")({
  head: ({ params }) => ({ meta: [
    { title: `Agendar horário online | ${params.slug}` },
    { name: "description", content: "Escolha dois ou mais serviços, profissional, data e horário e confirme seu agendamento online." },
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
  const [step, setStep] = useState(1);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [barberId, setBarberId] = useState("");
  const [data, setData] = useState(todayIso());
  const [hora, setHora] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
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

  const selectedServices = useMemo(() => (base?.services ?? []).filter((s) => serviceIds.includes(s.id)), [base?.services, serviceIds]);
  const totalValor = selectedServices.reduce((sum, s) => sum + Number(s.preco), 0);
  const totalDuracao = selectedServices.reduce((sum, s) => sum + Number(s.duracao_minutos), 0);
  const horarioDoDia = base?.businessHours.find((h) => h.dia_semana === diaSemana(data));
  const semana = Array.from({ length: 7 }, (_, i) => { const iso = addDays(todayIso(), i); const h = base?.businessHours.find((item) => item.dia_semana === diaSemana(iso)); return { iso, dia: diaSemana(iso), nome: DIAS[diaSemana(iso)], horario: h }; });

  const barbeirosDisponiveis = useMemo(() => (base?.barbers ?? []).filter((b) => serviceIds.every((serviceId) => {
    const links = (base?.links ?? []).filter((l) => l.service_id === serviceId);
    return links.length === 0 || links.some((l) => l.barber_id === b.id);
  })), [base?.barbers, base?.links, serviceIds]);

  useEffect(() => {
    if (barberId && !barbeirosDisponiveis.some((b) => b.id === barberId)) setBarberId("");
  }, [barbeirosDisponiveis, barberId]);

  const { data: horarios = [], isFetching: buscandoHorarios, isError: erroAoBuscarHorarios, refetch: recarregarHorarios } = useQuery({
    queryKey: ["horarios-publicos-multiplos", slug, barberId, serviceIds.join(","), data],
    enabled: step === 3 && serviceIds.length >= 2 && Boolean(barberId && data),
    queryFn: async () => {
      const { data: res, error } = await supabase.rpc("horarios_disponiveis_multiplos" as never, { p_slug: slug, p_service_ids: serviceIds, p_barber_id: barberId, p_data: data } as never);
      if (error) throw error;
      return res ?? [];
    },
  });

  const metodo = metodos.find((m) => m.id === paymentMethodId);
  function selecionarServico(id: string) {
    setServiceIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setBarberId("");
    setHora("");
  }
  function selecionarData(novaData: string) { setData(novaData); setHora(""); }
  function validarDados() { if (nome.trim().length < 3) return "Informe seu nome completo."; if (!isPhone(telefone)) return "Informe um telefone válido com DDD."; return null; }
  function validarPagamento() { if (metodos.length === 0) return null; if (!paymentMethodId) return "Escolha um método de pagamento."; return null; }
  async function copiarPix() { if (!metodo?.pix_key) return; try { await navigator.clipboard.writeText(metodo.pix_key); toast.success("Chave Pix copiada!"); } catch { toast.error("Não foi possível copiar automaticamente."); } }

  const confirmar = useMutation({
    mutationFn: async () => {
      const erro = validarDados() ?? validarPagamento();
      if (erro) throw new Error(erro);
      const { data: appointmentId, error } = await supabase.rpc("criar_agendamento_publico_multiplos" as never, {
        p_slug: slug,
        p_service_ids: serviceIds,
        p_barber_id: barberId,
        p_data: data,
        p_hora: hora,
        p_nome: nome.trim(),
        p_telefone: telefone.trim(),
        ...(paymentMethodId ? { p_payment_method_id: paymentMethodId } : {}),
        ...(observacao.trim() ? { p_observacao: observacao.trim() } : {}),
      } as never);
      if (error) throw new Error(error.message);
      const servicosTexto = selectedServices.map((s) => s.nome).join(", ");
      const url = waLink(base!.shop, mensagemAgendamento({ barbearia: base!.shop.nome, cliente: nome.trim(), telefoneCliente: telefone.trim(), servico: servicosTexto, barbeiro: base!.barbers.find((b) => b.id === barberId)?.nome ?? "", data, hora, duracao: totalDuracao, valor: totalValor, ...(metodo ? { pagamento: metodo.name } : {}), observacao }));
      return { appointmentId, whatsUrl: url };
    },
    onSuccess: ({ whatsUrl: url }) => { setWhatsUrl(url); setStep(7); if (url) window.open(url, "_blank", "noopener,noreferrer"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Centro>Carregando...</Centro>;
  if (!base) return <Centro><h1 className="text-3xl">Barbearia não encontrada.</h1><Link to="/" className="mt-4 inline-block text-primary underline">Voltar ao início</Link></Centro>;
  const barbeiro = base.barbers.find((b) => b.id === barberId);
  const resumo: [string, string][] = [["Barbearia", base.shop.nome], ["Serviços", selectedServices.map((s) => s.nome).join(", ")], ["Barbeiro", barbeiro?.nome ?? ""], ["Data", brDate(data)], ["Horário", hora], ["Duração total", `${totalDuracao} minutos`], ["Valor total", brl(totalValor)], ["Cliente", nome.trim()], ["WhatsApp", telefone.trim()], ...(metodo ? [["Forma de pagamento", metodo.name] as [string, string]] : []), ...(observacao.trim() ? [["Observação", observacao.trim()] as [string, string]] : [])];

  if (step === 7) return <Centro><Check className="mx-auto h-12 w-12 text-primary" aria-hidden="true" /><h1 className="mt-6 text-4xl">Agendamento confirmado!</h1><div className="mx-auto mt-8 max-w-md rounded-lg border border-border bg-card p-6 text-left text-sm">{resumo.map(([k, v]) => <p key={k} className="flex justify-between gap-4 border-b border-border/60 py-1.5 last:border-0"><span className="text-muted-foreground">{k}</span><span className="text-right">{v}</span></p>)}</div>{metodo && isPix(metodo.name) && metodo.pix_key && <div className="mx-auto mt-5 max-w-md rounded-lg border border-primary/30 bg-primary/5 p-5 text-left"><p className="text-xs uppercase tracking-widest text-primary">Pagamento via Pix</p><p className="mt-2 text-sm"><span className="text-muted-foreground">Beneficiário:</span> {metodo.pix_beneficiary || "Não informado"}</p><div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3"><span className="min-w-0 break-all text-sm">{metodo.pix_key}</span><button type="button" onClick={copiarPix} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary px-3 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"><Copy className="h-3.5 w-3.5" />Copiar chave</button></div></div>}{whatsUrl && <a href={whatsUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-sm bg-emerald-500 px-6 py-3 font-display tracking-widest text-white hover:bg-emerald-600"><MessageCircle className="h-5 w-5" /> ENVIAR NO WHATSAPP</a>}<div><Link to="/$slug" params={{ slug }} className="mt-6 inline-block rounded-sm border border-border px-6 py-3 text-sm hover:border-primary hover:text-primary">Voltar para a barbearia</Link></div></Centro>;

  return <div className="min-h-screen bg-background px-5 py-10 text-foreground"><div className="mx-auto max-w-xl"><Link to="/$slug" params={{ slug }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> {base.shop.nome}</Link><div className="mt-6 flex gap-2">{[1,2,3,4,5,6].map((n) => <div key={n} className={`h-1 flex-1 rounded ${n <= step ? "bg-primary" : "bg-secondary"}`} />)}</div>

  {step === 1 && <section className="mt-8"><h1 className="text-3xl">Escolha os serviços</h1><p className="mt-2 text-sm text-muted-foreground">Selecione <strong>pelo menos dois serviços</strong> para montar seu atendimento. Você pode tocar em vários itens.</p><div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-4"><p className="text-sm font-medium text-primary">{serviceIds.length} selecionado{serviceIds.length === 1 ? "" : "s"}</p>{serviceIds.length >= 2 && <p className="mt-1 text-xs text-muted-foreground">Total: {brl(totalValor)} · {totalDuracao} min</p>}</div><div className="mt-4 space-y-3">{base.services.length === 0 && <p className="text-muted-foreground">Esta barbearia ainda não cadastrou serviços.</p>}{base.services.map((s) => { const selecionado = serviceIds.includes(s.id); return <button key={s.id} type="button" onClick={() => selecionarServico(s.id)} className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition ${selecionado ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border bg-card hover:border-primary/60"}`} aria-pressed={selecionado}><span className="flex items-center gap-3"><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selecionado ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}>{selecionado && <Check className="h-3.5 w-3.5" />}</span><span><span className="text-lg">{s.nome}</span><span className="block text-sm text-muted-foreground">{s.duracao_minutos} min</span></span></span><span className="font-display text-xl text-primary">{brl(s.preco)}</span></button>; })}</div><button type="button" disabled={serviceIds.length < 2} onClick={() => setStep(2)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 font-display text-lg tracking-widest text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40">PROSSEGUIR <ArrowRight className="h-5 w-5" /></button></section>}

  {step === 2 && <section className="mt-8"><h1 className="text-3xl">Escolha o profissional</h1><p className="mt-2 text-sm text-muted-foreground">O profissional precisa atender todos os serviços selecionados.</p><div className="mt-6 space-y-3">{barbeirosDisponiveis.length === 0 && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground">Nenhum profissional atende todos os serviços selecionados.</p>}{barbeirosDisponiveis.map((b) => <button key={b.id} type="button" onClick={() => { setBarberId(b.id); setStep(3); }} className="flex w-full items-center gap-4 rounded-lg border border-border bg-card p-4 text-left hover:border-primary"><span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-secondary font-display text-xl text-primary">{b.foto_url ? <img src={b.foto_url} alt={b.nome} className="h-full w-full object-cover" /> : b.nome.slice(0, 1)}</span><span><span className="text-lg">{b.nome}</span>{b.descricao && <span className="block text-sm text-muted-foreground">{b.descricao}</span>}</span></button>)}</div><button type="button" className="mt-6 text-sm text-muted-foreground underline" onClick={() => setStep(1)}>Voltar</button></section>}

  {step === 3 && <section className="mt-8"><h1 className="text-3xl">Data e horário</h1><p className="mt-2 text-sm text-muted-foreground">O horário disponível considera a duração somada de todos os serviços.</p><div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-2">{semana.map((item) => { const aberto = horaValida(item.horario ?? { dia_semana: item.dia, aberto: false, hora_inicio: null, hora_fim: null, intervalo_inicio: null, intervalo_fim: null }); const selecionado = item.iso === data; return <button key={item.iso} type="button" disabled={!aberto} onClick={() => selecionarData(item.iso)} className={`min-w-0 rounded-lg border px-1 py-3 text-center transition ${selecionado ? "border-primary bg-primary/15 text-primary" : aberto ? "border-border bg-card hover:border-primary" : "cursor-not-allowed border-border/50 bg-secondary/30 opacity-40"}`}><span className="block truncate text-[10px] uppercase tracking-wider">{item.nome.slice(0, 3)}</span><span className="mt-1 block text-lg font-semibold">{item.iso.slice(8, 10)}</span></button>; })}</div><input type="date" className={`${inputCls} mt-4`} min={todayIso()} max={addDays(todayIso(), 60)} value={data} onChange={(e) => selecionarData(e.target.value)} />{horarioDoDia && horaValida(horarioDoDia) && <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Horário de funcionamento</p><p className="mt-1 text-lg font-medium text-primary">{hhmm(horarioDoDia.hora_inicio!)} às {hhmm(horarioDoDia.hora_fim!)}</p></div>}<div className="mt-5 rounded-lg border border-border bg-card/40 p-4"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /><h2 className="text-base font-semibold">Horários disponíveis</h2></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{buscandoHorarios && <div className="col-span-full flex items-center gap-2 py-3 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4 animate-pulse" /> Carregando...</div>}{!buscandoHorarios && erroAoBuscarHorarios && <div className="col-span-full rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">Não foi possível carregar os horários.<button type="button" onClick={() => recarregarHorarios()} className="ml-2 underline">Tentar novamente</button></div>}{!buscandoHorarios && !erroAoBuscarHorarios && horarios.length === 0 && <div className="col-span-full py-3 text-sm text-muted-foreground">Não há horários livres nesta data.</div>}{!buscandoHorarios && !erroAoBuscarHorarios && horarios.map((h: any) => <button key={`${h.barber_id}-${h.hora}`} type="button" onClick={() => { setHora(hhmm(h.hora)); setStep(4); }} className="rounded-md border border-border bg-card px-4 py-3 text-center font-display text-lg transition hover:border-primary hover:bg-primary/10 hover:text-primary">{hhmm(h.hora)}</button>)}</div></div><button type="button" className="mt-6 text-sm text-muted-foreground underline" onClick={() => setStep(2)}>Voltar</button></section>}

  {step === 4 && <section className="mt-8"><h1 className="text-3xl">Seus dados</h1><p className="mt-2 text-sm text-muted-foreground">{selectedServices.map((s) => s.nome).join(", ")} · {brDate(data)} às {hora} · {brl(totalValor)}</p><form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); const erro = validarDados(); if (erro) { toast.error(erro); return; } setStep(5); }}><input className={`${inputCls} uppercase`} placeholder="Nome completo" maxLength={120} value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} required /><input className={inputCls} placeholder="Telefone / WhatsApp" type="tel" inputMode="numeric" maxLength={15} value={telefone} onChange={(e) => setTelefone(formatarTelefone(e.target.value))} required /><textarea className={`${inputCls} uppercase`} rows={3} maxLength={500} placeholder="Observação (opcional)" value={observacao} onChange={(e) => setObservacao(e.target.value.toUpperCase())} /><button className="w-full rounded-md bg-primary py-3 font-display text-lg tracking-widest text-primary-foreground hover:bg-primary/90">CONTINUAR</button></form><button type="button" className="mt-6 text-sm text-muted-foreground underline" onClick={() => setStep(3)}>Voltar</button></section>}

  {step === 5 && <section className="mt-8"><h1 className="text-3xl">Como você pretende pagar?</h1><p className="mt-2 text-sm text-muted-foreground">Selecione uma forma de pagamento.</p><div className="mt-6 space-y-3">{metodos.length === 0 && <p className="text-sm text-muted-foreground">Esta barbearia ainda não cadastrou meios de pagamento. Combine o pagamento diretamente com ela.</p>}{metodos.map((m) => <div key={m.id} className={`rounded-lg border bg-card ${paymentMethodId === m.id ? "border-primary" : "border-border"}`}><button type="button" onClick={() => setPaymentMethodId(m.id)} className="flex w-full items-center gap-3 p-4 text-left"><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${paymentMethodId === m.id ? "border-primary" : "border-muted-foreground"}`}>{paymentMethodId === m.id && <span className="h-2 w-2 rounded-full bg-primary" />}</span><span><span className="text-lg">{m.icon ? `${m.icon} ` : ""}{m.name}</span>{m.description && <span className="block text-sm text-muted-foreground">{m.description}</span>}</span></button>{paymentMethodId === m.id && isPix(m.name) && <div className="border-t border-primary/20 bg-primary/5 p-4"><p className="text-xs uppercase tracking-widest text-primary">Pagamento via Pix</p><p className="mt-2 text-sm"><span className="text-muted-foreground">Beneficiário:</span> {m.pix_beneficiary || "Não informado"}</p>{m.pix_key ? <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3"><span className="min-w-0 break-all text-sm">{m.pix_key}</span><button type="button" onClick={copiarPix} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary px-3 py-2 text-xs font-semibold text-primary"> <Copy className="h-3.5 w-3.5" />Copiar</button></div> : <p className="mt-3 text-xs text-muted-foreground">A chave Pix ainda não foi cadastrada.</p>}</div>}</div>)}</div><button type="button" onClick={() => { const erro = validarPagamento(); if (erro) { toast.error(erro); return; } setStep(6); }} className="mt-6 w-full rounded-md bg-primary py-3 font-display text-lg tracking-widest text-primary-foreground">REVISAR AGENDAMENTO</button><button type="button" className="mt-6 text-sm text-muted-foreground underline" onClick={() => setStep(4)}>Voltar</button></section>}

  {step === 6 && <section className="mt-8"><h1 className="text-3xl">Confira seu agendamento</h1><div className="mt-6 rounded-lg border border-border bg-card p-6 text-sm">{resumo.map(([k, v]) => <p key={k} className="flex justify-between gap-4 border-b border-border/60 py-2 last:border-0"><span className="text-muted-foreground">{k}</span><span className="text-right">{v}</span></p>)}</div><button type="button" disabled={confirmar.isPending} onClick={() => confirmar.mutate()} className="mt-6 w-full rounded-md bg-primary py-4 font-display text-lg tracking-widest text-primary-foreground disabled:opacity-60">{confirmar.isPending ? "CONFIRMANDO..." : "CONFIRMAR AGENDAMENTO"}</button><p className="mt-3 text-center text-xs text-muted-foreground">Ao confirmar, abriremos o WhatsApp da barbearia com o resumo do seu agendamento.</p><button type="button" className="mt-6 text-sm text-muted-foreground underline" onClick={() => setStep(5)}>Voltar</button></section>}
  </div><WhatsAppFloat shop={base.shop} /></div>;
}

function Centro({ children }: { children: React.ReactNode }) { return <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center text-foreground"><div>{children}</div></div>; }
