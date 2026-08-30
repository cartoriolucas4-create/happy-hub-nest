import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, Empty } from "@/components/admin/AdminShell";
import { LicenseBanner } from "@/components/admin/AccessGate";
import { useShop } from "@/lib/shop";
import { useSetupStatus } from "@/lib/setup";
import { brl, hhmm, statusClass, STATUS_LABEL, todayIso, addDays } from "@/lib/barber";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard | BarberFlow" },
      { name: "description", content: "Indicadores e agenda do dia da sua barbearia." },
      { property: "og:title", content: "Dashboard | BarberFlow" },
      { property: "og:description", content: "Painel administrativo da barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: shop, isLoading } = useShop();
  const { data: setup } = useSetupStatus(Boolean(shop));
  const hoje = todayIso();

  const { data } = useQuery({
    queryKey: ["dashboard", shop?.id, hoje],
    enabled: Boolean(shop?.id),
    queryFn: async () => {
      const [hojeRes, semanaRes, clientesRes, barbeirosRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("*, barbers(nome), services(nome)")
          .eq("data", hoje)
          .order("hora_inicio"),
        supabase
          .from("appointments")
          .select("valor, status, data")
          .gte("data", addDays(hoje, -6))
          .lte("data", hoje),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("barbers").select("id", { count: "exact", head: true }).eq("ativo", true),
      ]);
      if (hojeRes.error) throw hojeRes.error;
      return {
        hoje: hojeRes.data ?? [],
        semana: semanaRes.data ?? [],
        clientes: clientesRes.count ?? 0,
        barbeiros: barbeirosRes.count ?? 0,
      };
    },
  });

  const ativosHoje = (data?.hoje ?? []).filter((a) => a.status !== "cancelado");
  const faturamentoHoje = ativosHoje
    .filter((a) => a.status !== "nao_compareceu")
    .reduce((s, a) => s + Number(a.valor), 0);
  const faturamentoSemana = (data?.semana ?? [])
    .filter((a) => a.status === "concluido" || a.status === "confirmado")
    .reduce((s, a) => s + Number(a.valor), 0);

  return (
    <AdminShell
      title={shop?.nome ?? "Dashboard"}
      subtitle="Visão geral de hoje"
      actions={
        shop ? (
          <Link
            to="/admin/meu-link"
            className="rounded-md border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary"
          >
            /barbearia/{shop.slug}
          </Link>
        ) : null
      }
    >
      <LicenseBanner />
      {shop && setup && !setup.concluida && <SetupChecklist setup={setup} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={CalendarDays} label="Agendamentos hoje" value={String(ativosHoje.length)} />
        <Card icon={DollarSign} label="Faturamento hoje" value={brl(faturamentoHoje)} />
        <Card icon={Clock} label="Faturamento 7 dias" value={brl(faturamentoSemana)} />
        <Card icon={Users} label="Clientes cadastrados" value={String(data?.clientes ?? 0)} />
      </div>

      <h2 className="mt-12 text-2xl">Agenda de hoje</h2>
      <div className="mt-4 space-y-3">
        {isLoading && <Empty>Carregando...</Empty>}
        {data && data.hoje.length === 0 && <Empty>Nenhum agendamento para hoje.</Empty>}
        {(data?.hoje ?? []).map((a) => (
          <div
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
          >
            <div>
              <p className="font-display text-xl text-primary">
                {hhmm(a.hora_inicio)} – {hhmm(a.hora_fim)}
              </p>
              <p className="mt-1 text-sm">
                {a.cliente_nome} · {a.services?.nome ?? "Serviço"} · {a.barbers?.nome}
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs ${statusClass(a.status)}`}>
              {STATUS_LABEL[a.status]}
            </span>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}

const SETUP_ITEMS = [
  { key: "dias_atendimento", label: "Dias de atendimento", to: "/admin/horarios" },
  { key: "barbeiros", label: "Barbeiros", to: "/admin/barbeiros" },
  { key: "servicos", label: "Serviços", to: "/admin/servicos" },
  { key: "horarios", label: "Horários", to: "/admin/horarios" },
  { key: "meios_pagamento", label: "Meios de pagamento", to: "/admin/pagamentos" },
] as const;

function SetupChecklist({ setup }: { setup: ReturnType<typeof useSetupStatus>["data"] }) {
  const firstPending = SETUP_ITEMS.find((item) => !setup?.[item.key]);
  return (
    <section className="mb-8 rounded-lg border border-primary/40 bg-primary/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-sm tracking-widest">CONFIGURAÇÃO INICIAL PENDENTE</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete as configurações necessárias para começar a utilizar sua barbearia.
          </p>
        </div>
        {firstPending && (
          <Link
            to={firstPending.to}
            className="rounded-md bg-primary px-4 py-2 text-xs font-medium tracking-wider text-primary-foreground"
          >
            COMEÇAR CONFIGURAÇÃO
          </Link>
        )}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {SETUP_ITEMS.map((item) => {
          const complete = Boolean(setup?.[item.key]);
          return (
            <Link
              key={item.key}
              to={item.to}
              className="flex items-center gap-2 rounded-md border border-border/70 bg-background/40 px-3 py-2 text-sm hover:border-primary"
            >
              {complete ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <CircleAlert className="h-4 w-4 text-primary" />
              )}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Card({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
      <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
    </div>
  );
}
