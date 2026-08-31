import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Users, DollarSign, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, Empty } from "@/components/admin/AdminShell";
import { SetupChecklist } from "@/components/admin/SetupChecklist";
import { useShop } from "@/lib/shop";
import { brl, hhmm, statusClass, STATUS_LABEL, todayIso, addDays } from "@/lib/barber";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard | BarberFlow" },
      { name: "description", content: "Indicadores e agenda do dia da sua barbearia." },
      { property: "og:title", content: "Dashboard | BarberFlow" },
      { property: "og:description", content: "Painel administrativo da barbearia." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: shop, isLoading } = useShop();
  const hoje = todayIso();
  const { data } = useQuery({
    queryKey: ["dashboard", shop?.id, hoje],
    enabled: Boolean(shop?.id),
    queryFn: async () => {
      const [hojeRes, semanaRes, clientesRes] = await Promise.all([
        supabase.from("appointments").select("*, barbers(nome), services(nome)").eq("data", hoje).order("hora_inicio"),
        supabase.from("appointments").select("valor, status, data").gte("data", addDays(hoje, -6)).lte("data", hoje),
        supabase.from("customers").select("id", { count: "exact", head: true }),
      ]);
      if (hojeRes.error) throw hojeRes.error;
      return { hoje: hojeRes.data ?? [], semana: semanaRes.data ?? [], clientes: clientesRes.count ?? 0 };
    },
  });
  const ativosHoje = (data?.hoje ?? []).filter((a) => a.status !== "cancelado");
  const faturamentoHoje = ativosHoje.filter((a) => a.status !== "nao_compareceu").reduce((s, a) => s + Number(a.valor), 0);
  const faturamentoSemana = (data?.semana ?? []).filter((a) => a.status === "concluido" || a.status === "confirmado").reduce((s, a) => s + Number(a.valor), 0);

  return <AdminShell title={shop?.nome ?? "Dashboard"} subtitle="Visão geral de hoje" actions={shop ? <Link to="/admin/meu-link" className="rounded-md border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary">/barbearia/{shop.slug}</Link> : null}>
    {shop && <SetupChecklist shopId={shop.id} />}
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
      {(data?.hoje ?? []).map((a) => <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"><div><p className="font-display text-xl text-primary">{hhmm(a.hora_inicio)} – {hhmm(a.hora_fim)}</p><p className="mt-1 text-sm">{a.cliente_nome} · {a.services?.nome ?? "Serviço"} · {a.barbers?.nome}</p></div><span className={`rounded-full border px-3 py-1 text-xs ${statusClass(a.status)}`}>{STATUS_LABEL[a.status]}</span></div>)}
    </div>
  </AdminShell>;
}

function Card({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-card p-5"><Icon className="h-5 w-5 text-primary" aria-hidden="true" /><p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl">{value}</p></div>;
}
