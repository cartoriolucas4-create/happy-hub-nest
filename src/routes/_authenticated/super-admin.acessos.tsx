import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SuperShell } from "@/components/superadmin/SuperShell";
import {
  STATUS_LICENCA,
  dataHoraBr,
  formatarRestante,
  restanteMs,
  statusLicencaClass,
  type LicenseStatus,
} from "@/lib/license";

const FAIXAS = [
  { dias: 1, label: "24 horas" },
  { dias: 3, label: "3 dias" },
  { dias: 7, label: "7 dias" },
  { dias: 30, label: "30 dias" },
] as const;

export const Route = createFileRoute("/_authenticated/super-admin/acessos")({
  head: () => ({
    meta: [
      { title: "Acessos expirando | Super Admin" },
      { name: "description", content: "Clientes com acesso próximo do vencimento." },
      { property: "og:title", content: "Acessos expirando | Super Admin" },
      { property: "og:description", content: "Renovações pendentes da plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Acessos,
});

function Acessos() {
  const [dias, setDias] = useState<number>(7);

  const { data, isLoading } = useQuery({
    queryKey: ["sa-expirando", dias],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sa_expirando", { p_dias: dias });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <SuperShell title="Acessos expirando" subtitle="Contate o cliente para renovar">
      <div className="flex flex-wrap gap-2">
        {FAIXAS.map((f) => (
          <button
            key={f.dias}
            onClick={() => setDias(f.dias)}
            className={`rounded-full border px-4 py-1.5 text-xs ${
              dias === f.dias
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {data?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum acesso vencendo nesse período.</p>
        )}
        {(data ?? []).map((c) => {
          const ms = restanteMs(c.vencimento);
          return (
            <Link
              key={c.user_id}
              to="/super-admin/clientes/$id"
              params={{ id: c.user_id }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary"
            >
              <div>
                <p className="text-sm">
                  {c.nome || c.email}
                  {c.barbearia && <span className="text-muted-foreground"> · {c.barbearia}</span>}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.telefone ?? "sem telefone"} · vence {dataHoraBr(c.vencimento)}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${statusLicencaClass(
                    c.status as LicenseStatus,
                  )}`}
                >
                  {STATUS_LICENCA[c.status as LicenseStatus]}
                </span>
                <p className="mt-2 text-xs text-muted-foreground">
                  {ms > 0 ? `restam ${formatarRestante(ms)}` : "vencido"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </SuperShell>
  );
}
