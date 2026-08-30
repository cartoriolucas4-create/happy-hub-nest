import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, Empty, btnGhost, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";
import { addDays, brDate, brl, hhmm, STATUS_LABEL, statusClass, todayIso, DIAS } from "@/lib/barber";

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
  const { data: shop } = useShop();
  const [dia, setDia] = useState(todayIso());
  const [modo, setModo] = useState<"dia" | "semana">("dia");
  const [barbeiro, setBarbeiro] = useState("");

  const inicio = modo === "dia" ? dia : dia;
  const fim = modo === "dia" ? dia : addDays(dia, 6);

  const { data: barbers } = useQuery({
    queryKey: ["barbers-min", shop?.id],
    enabled: Boolean(shop?.id),
    queryFn: async () => {
      const { data } = await supabase.from("barbers").select("id, nome").eq("ativo", true).order("nome");
      return data ?? [];
    },
  });

  const { data: lista, isLoading } = useQuery({
    queryKey: ["agenda", shop?.id, inicio, fim, barbeiro],
    enabled: Boolean(shop?.id),
    queryFn: async () => {
      let q = supabase
        .from("appointments")
        .select("*, barbers(nome), services(nome)")
        .gte("data", inicio)
        .lte("data", fim)
        .neq("status", "cancelado")
        .order("data")
        .order("hora_inicio");
      if (barbeiro) q = q.eq("barber_id", barbeiro);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const dias = modo === "dia" ? [dia] : Array.from({ length: 7 }, (_, i) => addDays(dia, i));

  return (
    <AdminShell title="Agenda" subtitle="Visualize os atendimentos por dia ou semana">
      <div className="flex flex-wrap items-center gap-3">
        <button className={btnGhost} onClick={() => setDia(addDays(dia, modo === "dia" ? -1 : -7))}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <input type="date" className={`${input} w-44`} value={dia} onChange={(e) => setDia(e.target.value)} />
        <button className={btnGhost} onClick={() => setDia(addDays(dia, modo === "dia" ? 1 : 7))}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button className={btnGhost} onClick={() => setDia(todayIso())}>
          Hoje
        </button>
        <select className={`${input} w-32`} value={modo} onChange={(e) => setModo(e.target.value as "dia" | "semana")}>
          <option value="dia">Dia</option>
          <option value="semana">Semana</option>
        </select>
        <select className={`${input} w-48`} value={barbeiro} onChange={(e) => setBarbeiro(e.target.value)}>
          <option value="">Todos os barbeiros</option>
          {(barbers ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="mt-6">
          <Empty>Carregando...</Empty>
        </div>
      )}

      <div className={`mt-8 grid gap-4 ${modo === "semana" ? "lg:grid-cols-2" : ""}`}>
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
                      <p className="font-display text-lg text-primary">
                        {hhmm(a.hora_inicio)}–{hhmm(a.hora_fim)}
                      </p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(a.status)}`}>
                        {STATUS_LABEL[a.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{a.cliente_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.services?.nome ?? "Serviço"} · {a.barbers?.nome} · {brl(a.valor)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
