import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, ShieldCheck, AlertTriangle, Lock, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SuperShell } from "@/components/superadmin/SuperShell";
import { STATUS_LICENCA, dataHoraBr, statusLicencaClass, type LicenseStatus } from "@/lib/license";

export const Route = createFileRoute("/_authenticated/super-admin/")({
  head: () => ({
    meta: [
      { title: "Super Admin | BarberFlow" },
      { name: "description", content: "Painel geral da plataforma: clientes, licenças e acessos." },
      { property: "og:title", content: "Super Admin | BarberFlow" },
      { property: "og:description", content: "Administração geral da plataforma BarberFlow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuperDashboard,
});

function SuperDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["sa-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sa_stats");
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const { data: recentes } = useQuery({
    queryKey: ["sa-recentes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sa_clientes", { p_busca: "", p_status: "todos" });
      if (error) throw error;
      return (data ?? []).slice(0, 8);
    },
  });

  const { data: expirando } = useQuery({
    queryKey: ["sa-expirando", 7],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sa_expirando", { p_dias: 7 });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <SuperShell title="Painel da Plataforma" subtitle="Administração geral da plataforma">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={Users} label="Clientes totais" value={stats?.total_clientes ?? 0} />
        <Card icon={Clock} label="Testes ativos" value={stats?.em_teste ?? 0} />
        <Card icon={ShieldCheck} label="Acessos ativos" value={stats?.ativos ?? 0} />
        <Card icon={AlertTriangle} label="Expirados" value={stats?.expirados ?? 0} />
        <Card icon={AlertTriangle} label="Expirando (7 dias)" value={stats?.expirando ?? 0} />
        <Card icon={Lock} label="Bloqueados" value={stats?.bloqueados ?? 0} />
        <Card icon={Lock} label="Suspensos" value={stats?.suspensos ?? 0} />
        <Card icon={Store} label="Barbearias" value={stats?.total_barbearias ?? 0} />
      </div>

      <h2 className="mt-12 text-2xl">Clientes recentes</h2>
      <div className="mt-4 space-y-3">
        {(recentes ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
        )}
        {(recentes ?? []).map((c) => (
          <Link
            key={c.user_id}
            to="/super-admin/clientes/$id"
            params={{ id: c.user_id }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary"
          >
            <div>
              <p className="text-sm">
                {c.nome || "Sem nome"} ·{" "}
                <span className="text-muted-foreground">{c.barbearia ?? "sem barbearia"}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {c.email} · vence em {dataHoraBr(c.vencimento)}
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs ${statusLicencaClass(c.status as LicenseStatus)}`}
            >
              {STATUS_LICENCA[c.status as LicenseStatus]}
            </span>
          </Link>
        ))}
      </div>

      <h2 className="mt-12 text-2xl">Acessos expirando</h2>
      <div className="mt-4 space-y-3">
        {(expirando ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum acesso vencendo nos próximos 7 dias.
          </p>
        )}
        {(expirando ?? []).map((c) => (
          <Link
            key={c.user_id}
            to="/super-admin/clientes/$id"
            params={{ id: c.user_id }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary"
          >
            <div>
              <p className="text-sm">
                {c.nome || c.email} · {c.barbearia ?? "sem barbearia"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{c.telefone ?? "sem telefone"}</p>
            </div>
            <span className="text-xs text-muted-foreground">{dataHoraBr(c.vencimento)}</span>
          </Link>
        ))}
      </div>
    </SuperShell>
  );
}

function Card({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-5">
      <Icon className="h-5 w-5 text-sky-300" aria-hidden="true" />
      <p className="mt-3 text-xs uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
    </div>
  );
}
