import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SuperShell, sInput } from "@/components/superadmin/SuperShell";
import {
  STATUS_LICENCA,
  dataBr,
  dataHoraBr,
  formatarRestante,
  restanteMs,
  statusLicencaClass,
  type LicenseStatus,
} from "@/lib/license";

const FILTROS = [
  { valor: "todos", label: "Todos" },
  { valor: "trial", label: "Teste" },
  { valor: "active", label: "Ativos" },
  { valor: "expired", label: "Expirados" },
  { valor: "blocked", label: "Bloqueados" },
  { valor: "suspended", label: "Suspensos" },
] as const;

export const Route = createFileRoute("/_authenticated/super-admin/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes da plataforma | Super Admin" },
      { name: "description", content: "Lista de clientes, status de licença e vencimentos." },
      { property: "og:title", content: "Clientes da plataforma | Super Admin" },
      { property: "og:description", content: "Gestão de contas e licenças da plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Clientes,
});

function Clientes() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<string>("todos");

  const { data, isLoading } = useQuery({
    queryKey: ["sa-clientes", busca, status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sa_clientes", {
        p_busca: busca,
        p_status: status,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <SuperShell title="Clientes" subtitle="Contas cadastradas na plataforma">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome, e-mail, telefone ou barbearia"
            className={`${sInput} pl-9`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setStatus(f.valor)}
              className={`rounded-full border px-4 py-1.5 text-xs ${
                status === f.valor
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>}
        {(data ?? []).map((c) => {
          const ms = restanteMs(c.vencimento);
          return (
            <Link
              key={c.user_id}
              to="/super-admin/clientes/$id"
              params={{ id: c.user_id }}
              className="block rounded-lg border border-border bg-card p-4 hover:border-primary"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm">
                    {c.nome || "Sem nome"}
                    {c.barbearia && <span className="text-muted-foreground"> · {c.barbearia}</span>}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.email ?? "sem e-mail"} · {c.telefone ?? "sem telefone"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cadastro {dataBr(c.criado_em)} · início {dataHoraBr(c.inicio)} · vence{" "}
                    {dataHoraBr(c.vencimento)}
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
                  <p className="text-xs text-muted-foreground">
                    {c.access_type === "trial" ? "Teste" : "Licença"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </SuperShell>
  );
}
