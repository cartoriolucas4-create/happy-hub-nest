import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, Empty, btnGhost, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";
import { addDays, brDate, brl, hhmm, STATUS_LABEL, statusClass, todayIso, DIAS } from "@/lib/barber";

function withTimeout<T>(promise: PromiseLike<T>, ms = 12000): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error("A consulta demorou mais que 12 segundos. Verifique sua conexão e tente novamente.")), ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  });
}

export const Route = createFileRoute("/_authenticated/admin/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda | BarberFlow" },
      { name: "description", content: "Agenda diária e semanal por barbeiro." },
      { property: "og:title", content: "Agenda | BarberFlow" },
      { property: "og:description", content: "Agenda da barbearia por dia e semana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Agenda,
});

function Agenda() {
  const { data: shop, isLoading: shopLoading, isError: shopError, error: shopLoadError, refetch: reloadShop } = useShop();
  const hoje = todayIso();
  const [dia, setDia] = useState(hoje);
  const [modo, setModo] = useState<"dia" | "semana">("semana");
  const [barbeiro, setBarbeiro] = useState("");

  const inicioSemana = addDays(dia, -new Date(`${dia}T12:00:00`).getDay());
  const inicio = modo === "dia" ? dia : inicioSemana;
  const fim = modo === "dia" ? dia : addDays(inicioSemana, 6);
  const diasNavegacao = Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i));

  const { data: barbers } = useQuery({
    queryKey: ["barbers-min", shop?.id],
    enabled: Boolean(shop?.id),
    queryFn: async () => {
      const { data } = await supabase.from("barbers").select("id, nome").eq("barbershop_id", shop!.id).eq("ativo", true).order("nome");
      return data ?? [];
    },
  });

  const { data: lista, isLoading, isError, error: listaError, refetch: recarregarAgenda, isFetching } = useQuery({
    queryKey: ["agenda", shop?.id, inicio, fim, barbeiro],
    enabled: Boolean(shop?.id),
    retry: 1,
    queryFn: async () => {
      if (!shop?.id) throw new Error("Não foi possível identificar a barbearia desta conta.");
      let q = supabase.from("appointments")
        .select("id, barbershop_id, customer_id, barber_id, service_id, cliente_nome, cliente_telefone, data, hora_inicio, hora_fim, valor, status, observacao, payment_method_id, payment_method_nome")
        .eq("barbershop_id", shop.id).gte("data", inicio).lte("data", fim)
        .neq("status", "cancelado").order("data").order("hora_inicio");
      if (barbeiro) q = q.eq("barber_id", barbeiro);
      const result = await withTimeout(q);
      if (result.error) throw new Error(`Falha ao consultar appointments: ${result.error.message} [${result.error.code ?? "sem código"}] ${result.error.details ?? ""}`);
      const rows = result.data ?? [];
      if (!rows.length) return [];
      const barberIds = [...new Set(rows.map((a) => a.barber_id).filter(Boolean))];
      const serviceIds = [...new Set(rows.map((a) => a.service_id).filter(Boolean))];
      const [barbersResult, servicesResult] = await withTimeout(Promise.all([
        barberIds.length ? supabase.from("barbers").select("id, nome").in("id", barberIds) : Promise.resolve({ data: [], error: null }),
        serviceIds.length ? supabase.from("services").select("id, nome").in("id", serviceIds) : Promise.resolve({ data: [], error: null }),
      ]));
      if (barbersResult.error) throw new Error(`Falha ao consultar barbeiros: ${barbersResult.error.message} [${barbersResult.error.code ?? "sem código"}]`);
      if (servicesResult.error) throw new Error(`Falha ao consultar serviços: ${servicesResult.error.message} [${servicesResult.error.code ?? "sem código"}]`);
      const barberMap = new Map((barbersResult.data ?? []).map((b) => [b.id, b.nome]));
      const serviceMap = new Map((servicesResult.data ?? []).map((s) => [s.id, s.nome]));
      return rows.map((a) => ({ ...a, barbers: { nome: barberMap.get(a.barber_id) ?? "" }, services: { nome: serviceMap.get(a.service_id) ?? "Serviço" } }));
    },
  });

  const dias = modo === "dia" ? [dia] : diasNavegacao;

  const selecionarDia = (d: string) => {
    setDia(d);
    setModo("dia");
  };

  const nomeDia = (d: string) => {
    const indice = new Date(`${d}T12:00:00`).getDay();
    const curto = DIAS[indice]?.slice(0, 3).toUpperCase() ?? "";
    if (d === hoje) return "HOJE";
    if (d === addDays(hoje, 1)) return "AMANHÃ";
    if (d === addDays(hoje, 2)) return "DEPOIS";
    return curto;
  };

  const abrirConversa = (telefone: string) => {
    const numeros = telefone.replace(/\D/g, "");
    if (!numeros) return;
    const numeroWhatsApp = numeros.startsWith("55") ? numeros : `55${numeros}`;
    window.open(`https://wa.me/${numeroWhatsApp}`, "_blank", "noopener,noreferrer");
  };

  return (
    <AdminShell title="Agenda" subtitle="Escolha o dia em um clique">
      <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <button
            className={`${btnGhost} h-10 w-10 shrink-0 p-0`}
            aria-label="Semana anterior"
            onClick={() => setDia(addDays(inicioSemana, -7))}
          >
            <ChevronLeft className="mx-auto h-4 w-4" />
          </button>

          <div className="min-w-0 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Semana de</p>
            <p className="font-display text-lg">{brDate(inicioSemana)} – {brDate(fim)}</p>
          </div>

          <button
            className={`${btnGhost} h-10 w-10 shrink-0 p-0`}
            aria-label="Próxima semana"
            onClick={() => setDia(addDays(inicioSemana, 7))}
          >
            <ChevronRight className="mx-auto h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {diasNavegacao.map((d) => {
            const selecionado = d === dia && modo === "dia";
            const hojeDia = d === hoje;
            return (
              <button
                key={d}
                onClick={() => selecionarDia(d)}
                aria-pressed={selecionado}
                className={`min-h-16 rounded-md border px-2 py-2 text-center transition-colors hover:border-primary ${
                  selecionado ? "border-primary bg-primary/15 text-primary" : "border-border bg-background"
                }`}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-80">
                  {nomeDia(d)}
                </span>
                <span className="mt-1 block font-display text-xl">{d.slice(8, 10)}</span>
                {hojeDia && <span className="mx-auto mt-1 block h-1 w-1 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <button
            className={`${btnGhost} ${dia === hoje && modo === "dia" ? "border-primary text-primary" : ""}`}
            onClick={() => selecionarDia(hoje)}
          >
            Hoje
          </button>
          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              className={`px-3 py-2 text-xs ${modo === "dia" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
              onClick={() => setModo("dia")}
            >
              Dia
            </button>
            <button
              className={`border-l border-border px-3 py-2 text-xs ${modo === "semana" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
              onClick={() => setModo("semana")}
            >
              Semana
            </button>
          </div>
          <select className={`${input} ml-auto w-full sm:w-48`} value={barbeiro} onChange={(e) => setBarbeiro(e.target.value)}>
            <option value="">Todos os barbeiros</option>
            {(barbers ?? []).map((b) => (
              <option key={b.id} value={b.id}>{b.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {shopLoading && <div className="mt-6"><Empty>Carregando dados da barbearia...</Empty></div>}
      {shopError && <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"><p className="font-medium text-destructive">Não foi possível identificar a barbearia.</p><p className="mt-1 text-muted-foreground">{shopLoadError instanceof Error ? shopLoadError.message : "Falha ao carregar os dados da conta."}</p><button type="button" className={`${btnGhost} mt-3`} onClick={() => reloadShop()}>TENTAR NOVAMENTE</button></div>}
      {Boolean(shop?.id) && isLoading && <div className="mt-6"><Empty>Carregando agenda...</Empty></div>}
      {Boolean(shop?.id) && isError && <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"><p className="font-medium text-destructive">Não foi possível carregar a agenda.</p><p className="mt-1 text-muted-foreground">{listaError instanceof Error ? listaError.message : typeof listaError === "string" ? listaError : JSON.stringify(listaError) || "Erro desconhecido."}</p><button type="button" className={`${btnGhost} mt-3`} disabled={isFetching} onClick={() => recarregarAgenda()}>{isFetching ? "TENTANDO NOVAMENTE..." : "TENTAR NOVAMENTE"}</button></div>}

      {Boolean(shop?.id) && !isLoading && !isError && <div className={`mt-6 grid gap-4 ${modo === "semana" ? "lg:grid-cols-2" : ""}`}>
        {dias.map((d) => {
          const doDia = (lista ?? []).filter((a) => a.data === d);
          const [, , dd] = d.split("-");
          const dow = DIAS[new Date(`${d}T12:00:00`).getDay()];
          return (
            <div key={d} className="rounded-lg border border-border bg-card p-4">
              <h2 className="font-display text-xl">
                {dow} <span className="text-primary">{brDate(d)}</span>
                <span className="sr-only">{dd}</span>
              </h2>
              <div className="mt-3 space-y-2">
                {doDia.length === 0 && <p className="text-sm text-muted-foreground">Sem atendimentos.</p>}
                {doDia.map((a) => (
                  <div key={a.id} className="rounded-md border border-border/70 bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-display text-lg text-primary">{hhmm(a.hora_inicio)}–{hhmm(a.hora_fim)}</p>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(a.status)}`}>{STATUS_LABEL[a.status]}</span>
                        <button
                          type="button"
                          onClick={() => abrirConversa(a.cliente_telefone)}
                          disabled={!a.cliente_telefone}
                          title="Falar com cliente no WhatsApp"
                          aria-label={`Falar com ${a.cliente_nome} no WhatsApp`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:pointer-events-none disabled:opacity-40"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Falar com cliente
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-sm">{a.cliente_nome}</p>
                    <p className="text-xs text-muted-foreground">{a.services?.nome ?? "Serviço"} · {a.barbers?.nome} · {brl(a.valor)}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>}
    </AdminShell>
  );
}
