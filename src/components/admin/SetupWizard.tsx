import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DIAS, brl, hhmm } from "@/lib/barber";
import { useSetupStatus } from "@/lib/setup";
import { btn, btnGhost, input } from "./AdminShell";

type ServiceForm = { nome: string; descricao: string; preco: string; duracao_minutos: string };
type BarberForm = { nome: string; telefone: string; descricao: string; foto_url: string };
type PaymentForm = { name: string; description: string; icon: string };
type HourRow = { dia_semana: number; hora_inicio: string; hora_fim: string; possui_intervalo: boolean; intervalo_inicio: string; intervalo_fim: string };

const emptyService: ServiceForm = { nome: "", descricao: "", preco: "", duracao_minutos: "" };
const emptyBarber: BarberForm = { nome: "", telefone: "", descricao: "", foto_url: "" };
const emptyPayment: PaymentForm = { name: "", description: "", icon: "" };
const keys = ["servicos", "barbeiros", "dias", "horarios", "pagamentos"] as const;

function parseMoney(value: string) { return Number(value.replace(/\./g, "").replace(",", ".")); }

function validHourRow(row: HourRow) {
  if (!row.hora_inicio || !row.hora_fim || row.hora_fim <= row.hora_inicio) return false;
  const hasStart = Boolean(row.intervalo_inicio);
  const hasEnd = Boolean(row.intervalo_fim);
  if (!row.possui_intervalo) return !hasStart && !hasEnd;
  if (!hasStart || !hasEnd) return false;
  if (row.intervalo_fim <= row.intervalo_inicio) return false;
  if (row.intervalo_inicio < row.hora_inicio || row.intervalo_fim > row.hora_fim) return false;
  return true;
}

export function SetupWizard({ shopId }: { shopId: string }) {
  const { data: status } = useSetupStatus(shopId);
  const [step, setStep] = useState(1);
  const [service, setService] = useState<ServiceForm>(emptyService);
  const [barber, setBarber] = useState<BarberForm>(emptyBarber);
  const [payment, setPayment] = useState<PaymentForm>(emptyPayment);
  const [days, setDays] = useState<number[]>([]);
  const [hours, setHours] = useState<HourRow[]>([]);

  const { data: current, refetch } = useQuery({
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

  useEffect(() => {
    if (!status || status.completo) return;
    const firstPending = keys.findIndex((key) => !status.itens.find((item) => item.key === key)?.ok);
    if (firstPending >= 0) setStep(firstPending + 1);
  }, [status]);

  useEffect(() => {
    if (!current) return;
    setDays(current.bh.filter((row) => row.aberto).map((row) => row.dia_semana));
    setHours(current.bh.filter((row) => row.aberto).map((row) => {
      const intervaloInicio = hhmm(row.intervalo_inicio);
      const intervaloFim = hhmm(row.intervalo_fim);
      return { dia_semana: row.dia_semana, hora_inicio: hhmm(row.hora_inicio), hora_fim: hhmm(row.hora_fim), possui_intervalo: Boolean(intervaloInicio && intervaloFim), intervalo_inicio: intervaloInicio, intervalo_fim: intervaloFim };
    }));
  }, [current]);

  const done = status?.itens ?? [];
  const completed = done.filter((item) => item.ok).length;
  const currentRows = useMemo(() => days.map((day) => hours.find((row) => row.dia_semana === day) ?? ({ dia_semana: day, hora_inicio: "", hora_fim: "", possui_intervalo: false, intervalo_inicio: "", intervalo_fim: "" })), [days, hours]);

  async function saveDaysAndHours() {
    if (!days.length) { toast.error("Selecione pelo menos um dia."); return false; }
    const rows = currentRows;
    if (rows.some((row) => !validHourRow(row))) { toast.error("Revise abertura e fechamento. Se houver intervalo, informe início e fim válidos dentro do expediente."); return false; }
    const existing = current?.bh ?? [];

    for (const oldRow of existing) {
      const selected = days.includes(oldRow.dia_semana);
      const edited = rows.find((item) => item.dia_semana === oldRow.dia_semana);
      const payload = selected && edited
        ? { aberto: true, hora_inicio: edited.hora_inicio, hora_fim: edited.hora_fim, intervalo_inicio: edited.possui_intervalo ? edited.intervalo_inicio : null, intervalo_fim: edited.possui_intervalo ? edited.intervalo_fim : null }
        : { aberto: false, intervalo_inicio: null, intervalo_fim: null };
      const { error } = await supabase.from("business_hours").update(payload).eq("id", oldRow.id).eq("barbershop_id", shopId);
      if (error) { toast.error(`Erro ao salvar ${DIAS[oldRow.dia_semana]}: ${error.message}`); return false; }
    }

    for (const row of rows.filter((item) => !existing.some((old) => old.dia_semana === item.dia_semana))) {
      const { error } = await supabase.from("business_hours").insert({ barbershop_id: shopId, dia_semana: row.dia_semana, aberto: true, hora_inicio: row.hora_inicio, hora_fim: row.hora_fim, intervalo_inicio: row.possui_intervalo ? row.intervalo_inicio : null, intervalo_fim: row.possui_intervalo ? row.intervalo_fim : null });
      if (error) { toast.error(`Erro ao cadastrar ${DIAS[row.dia_semana]}: ${error.message}`); return false; }
    }

    await refetch();
    toast.success("Dias, horários e intervalos salvos.");
    return true;
  }

  async function addService() {
    const preco = parseMoney(service.preco);
    const duracao = Number(service.duracao_minutos);
    if (service.nome.trim().length < 2 || !Number.isFinite(preco) || preco < 0 || !Number.isInteger(duracao) || duracao < 5 || duracao > 480) { toast.error("Informe nome, valor e duração válidos."); return; }
    const { error } = await supabase.from("services").insert({ barbershop_id: shopId, nome: service.nome.trim(), descricao: service.descricao.trim() || null, preco, duracao_minutos: duracao, ativo: true });
    if (error) { toast.error(error.message); return; }
    setService(emptyService); await refetch(); toast.success("Serviço cadastrado.");
  }

  async function addBarber() {
    if (barber.nome.trim().length < 2) { toast.error("Informe o nome do profissional."); return; }
    const { error } = await supabase.from("barbers").insert({ barbershop_id: shopId, nome: barber.nome.trim(), telefone: barber.telefone.trim() || null, descricao: barber.descricao.trim() || null, foto_url: barber.foto_url.trim() || null, ativo: true });
    if (error) { toast.error(error.message); return; }
    setBarber(emptyBarber); await refetch(); toast.success("Profissional cadastrado.");
  }

  async function addPayment() {
    if (payment.name.trim().length < 2) { toast.error("Informe o meio de pagamento."); return; }
    const ordem = current?.payments.length ? Math.max(...current.payments.map((item) => item.display_order)) + 1 : 0;
    const { error } = await supabase.from("payment_methods").insert({ barbershop_id: shopId, name: payment.name.trim(), description: payment.description.trim() || null, icon: payment.icon.trim() || null, active: true, display_order: ordem });
    if (error) { toast.error(error.message); return; }
    setPayment(emptyPayment); await refetch(); toast.success("Meio de pagamento cadastrado.");
  }

  function toggleDay(day: number) { setDays((old) => old.includes(day) ? old.filter((item) => item !== day) : [...old, day].sort((a, b) => a - b)); }
  function updateHour(day: number, field: keyof Omit<HourRow, "dia_semana">, value: string | boolean) {
    setHours((old) => {
      const found = old.find((row) => row.dia_semana === day);
      if (found) return old.map((row) => row.dia_semana === day ? { ...row, [field]: value } : row);
      return [...old, { dia_semana: day, hora_inicio: "", hora_fim: "", possui_intervalo: false, intervalo_inicio: "", intervalo_fim: "", [field]: value }];
    });
  }

  const ok = (key: string) => Boolean(done.find((item) => item.key === key)?.ok);
  const labels = ["Serviços", "Profissionais", "Dias", "Horários", "Pagamentos", "Finalização"];

  return <div className="max-w-4xl rounded-xl border border-primary/30 bg-card p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.25em] text-primary">Configuração inicial</p><h2 className="mt-2 text-2xl sm:text-3xl">Configure sua barbearia</h2><p className="mt-2 text-sm text-muted-foreground">Complete as informações da sua barbearia para começar a receber agendamentos.</p></div><div className="shrink-0 text-right text-xs text-muted-foreground">{completed} de 5 etapas concluídas</div></div>
    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full bg-primary transition-all duration-300" style={{ width: `${completed * 20}%` }} /></div>
    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-6">{labels.map((label, index) => { const complete = index === 5 ? completed === 5 : ok(keys[index]!); return <button key={label} type="button" onClick={() => setStep(index + 1)} className={`rounded-md border px-2 py-2 text-[11px] transition-colors ${step === index + 1 ? "border-primary text-primary" : complete ? "border-emerald-500/30 text-emerald-400" : "border-border text-muted-foreground"}`}>{complete ? "✓ " : ""}{label}</button>; })}</div>

    {step === 1 && <section className="mt-8"><h3 className="text-xl">Serviços</h3><p className="mt-1 text-sm text-muted-foreground">Cadastre pelo menos um serviço real. O valor é o preço cobrado do cliente e a duração é o tempo necessário para realizar o serviço.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-sm">Nome do serviço<input className={input + " mt-1"} value={service.nome} onChange={(e) => setService({ ...service, nome: e.target.value })} placeholder="Ex.: Corte" /></label><label className="text-sm">Valor<input className={input + " mt-1"} inputMode="decimal" value={service.preco} onChange={(e) => setService({ ...service, preco: e.target.value })} placeholder="R$ 0,00" /></label><label className="text-sm">Duração (minutos)<input className={input + " mt-1"} type="number" min={5} max={480} value={service.duracao_minutos} onChange={(e) => setService({ ...service, duracao_minutos: e.target.value })} placeholder="30" /></label><label className="text-sm">Descrição (opcional)<input className={input + " mt-1"} value={service.descricao} onChange={(e) => setService({ ...service, descricao: e.target.value })} /></label></div><div className="mt-5 flex flex-wrap gap-2"><button className={btn} onClick={addService}><Plus className="mr-2 inline h-4 w-4" />Cadastrar serviço</button><button className={btnGhost} onClick={() => setStep(2)}>Continuar <ChevronRight className="ml-1 inline h-4 w-4" /></button></div><ExistingList title="Serviços cadastrados" items={(current?.services ?? []).map((item) => `${item.nome} · ${brl(item.preco)} · ${item.duracao_minutos} min`)} /></section>}

    {step === 2 && <section className="mt-8"><h3 className="text-xl">Profissionais / Barbeiros</h3><p className="mt-1 text-sm text-muted-foreground">Cadastre os profissionais reais da sua barbearia. Nenhum profissional padrão é criado.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-sm">Nome<input className={input + " mt-1"} value={barber.nome} onChange={(e) => setBarber({ ...barber, nome: e.target.value })} /></label><label className="text-sm">Telefone (opcional)<input className={input + " mt-1"} value={barber.telefone} onChange={(e) => setBarber({ ...barber, telefone: e.target.value })} /></label><label className="text-sm">Especialidade (opcional)<input className={input + " mt-1"} value={barber.descricao} onChange={(e) => setBarber({ ...barber, descricao: e.target.value })} /></label><label className="text-sm">URL da foto (opcional)<input className={input + " mt-1"} value={barber.foto_url} onChange={(e) => setBarber({ ...barber, foto_url: e.target.value })} /></label></div><div className="mt-5 flex flex-wrap gap-2"><button className={btn} onClick={addBarber}><Plus className="mr-2 inline h-4 w-4" />Cadastrar profissional</button><button className={btnGhost} onClick={() => setStep(3)}>Continuar <ChevronRight className="ml-1 inline h-4 w-4" /></button></div><ExistingList title="Profissionais cadastrados" items={(current?.barbers ?? []).map((item) => item.nome)} /></section>}

    {step === 3 && <section className="mt-8"><h3 className="text-xl">Dias de atendimento</h3><p className="mt-1 text-sm text-muted-foreground">Selecione somente os dias em que a barbearia realmente atende. Nenhum dia é selecionado automaticamente.</p><div className="mt-5 grid gap-2 sm:grid-cols-2">{DIAS.map((day, index) => <button key={day} type="button" onClick={() => toggleDay(index)} className={`flex items-center gap-3 rounded-md border p-3 text-left transition-colors ${days.includes(index) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}><span>{days.includes(index) ? "☑" : "☐"}</span>{day}</button>)}</div><div className="mt-5 flex gap-2"><button className={btnGhost} onClick={() => setStep(2)}><ChevronLeft className="mr-1 inline h-4 w-4" />Voltar</button><button className={btn} onClick={() => days.length ? setStep(4) : toast.error("Selecione pelo menos um dia.")}>Continuar <ChevronRight className="ml-1 inline h-4 w-4" /></button></div></section>}

    {step === 4 && <section className="mt-8"><h3 className="text-xl">DIAS E HORÁRIOS DE ATENDIMENTO</h3><p className="mt-1 text-sm text-muted-foreground">Configure abertura e fechamento. O intervalo é opcional e usa somente início e fim no banco.</p><div className="mt-5 space-y-4">{days.map((day) => { const row = currentRows.find((item) => item.dia_semana === day)!; return <div key={day} className="rounded-lg border border-border bg-background/40 p-4"><div className="flex items-center justify-between"><h4 className="font-display text-sm tracking-widest">{DIAS[day]?.toUpperCase()}</h4><span className="text-xs text-primary">☑ Atende</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm">Abre<input className={input + " mt-1"} type="time" value={row.hora_inicio} onChange={(e) => updateHour(day, "hora_inicio", e.target.value)} /></label><label className="text-sm">Fecha<input className={input + " mt-1"} type="time" value={row.hora_fim} onChange={(e) => updateHour(day, "hora_fim", e.target.value)} /></label></div><label className="mt-4 flex items-center gap-3 rounded-md border border-border p-3 text-sm"><input type="checkbox" checked={row.possui_intervalo} onChange={(e) => updateHour(day, "possui_intervalo", e.target.checked)} /> Possui intervalo</label>{row.possui_intervalo && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm">Intervalo início<input className={input + " mt-1"} type="time" value={row.intervalo_inicio} onChange={(e) => updateHour(day, "intervalo_inicio", e.target.value)} /></label><label className="text-sm">Intervalo fim<input className={input + " mt-1"} type="time" value={row.intervalo_fim} onChange={(e) => updateHour(day, "intervalo_fim", e.target.value)} /></label></div>}{!validHourRow(row) && <p className="mt-3 flex items-center gap-2 text-xs text-primary"><AlertTriangle className="h-4 w-4" />Informe abertura e fechamento válidos. Se ativar intervalo, informe início e fim dentro do expediente.</p>}</div>; })}</div><div className="mt-5 flex gap-2"><button className={btnGhost} onClick={() => setStep(3)}><ChevronLeft className="mr-1 inline h-4 w-4" />Voltar</button><button className={btn} onClick={async () => { if (await saveDaysAndHours()) setStep(5); }}>Salvar e continuar <ChevronRight className="ml-1 inline h-4 w-4" /></button></div></section>}

    {step === 5 && <section className="mt-8"><h3 className="text-xl">Meios de pagamento</h3><p className="mt-1 text-sm text-muted-foreground">Cadastre pelo menos um meio de pagamento real. Nenhum meio é pré-selecionado.</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><label className="text-sm">Nome<input className={input + " mt-1"} value={payment.name} onChange={(e) => setPayment({ ...payment, name: e.target.value })} placeholder="Ex.: Pix" /></label><label className="text-sm">Descrição (opcional)<input className={input + " mt-1"} value={payment.description} onChange={(e) => setPayment({ ...payment, description: e.target.value })} /></label><label className="text-sm">Ícone (opcional)<input className={input + " mt-1"} value={payment.icon} onChange={(e) => setPayment({ ...payment, icon: e.target.value })} /></label></div><div className="mt-5 flex flex-wrap gap-2"><button className={btn} onClick={addPayment}><Plus className="mr-2 inline h-4 w-4" />Cadastrar pagamento</button><button className={btnGhost} onClick={() => setStep(4)}><ChevronLeft className="mr-1 inline h-4 w-4" />Voltar</button><button className={btn} onClick={async () => { if (await saveDaysAndHours()) toast.success("Configuração salva."); }}>Finalizar <Check className="ml-1 inline h-4 w-4" /></button></div><ExistingList title="Meios cadastrados" items={(current?.payments ?? []).map((item) => item.name)} /></section>}

    {step === 6 && <section className="mt-10 text-center"><Check className="mx-auto h-12 w-12 text-emerald-400" /><h3 className="mt-5 text-3xl">Configuração concluída!</h3><p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">Sua barbearia está pronta para usar o Meu Link, disponibilidade e agendamentos com os dados reais cadastrados.</p></section>}
  </div>;
}

function ExistingList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <div className="mt-8"><p className="text-xs uppercase tracking-widest text-muted-foreground">{title}</p><div className="mt-2 space-y-2">{items.map((item, index) => <div key={`${item}-${index}`} className="rounded-md border border-border px-3 py-2 text-sm">{item}</div>)}</div></div>;
}
