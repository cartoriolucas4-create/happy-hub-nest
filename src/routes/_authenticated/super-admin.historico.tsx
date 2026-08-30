import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SuperShell } from "@/components/superadmin/SuperShell";
import { dataHoraBr } from "@/lib/license";

export const Route = createFileRoute("/_authenticated/super-admin/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de acessos | Super Admin" },
      { name: "description", content: "Auditoria de liberações, bloqueios e renovações." },
      { property: "og:title", content: "Histórico de acessos | Super Admin" },
      { property: "og:description", content: "Registro de todas as alterações de licença." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Historico,
});

function Historico() {
  const { data, isLoading } = useQuery({
    queryKey: ["sa-historico", "todos"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sa_historico", { p_limit: 200 });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <SuperShell title="Histórico" subtitle="Auditoria das alterações de acesso">
      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>}
        {(data ?? []).map((h) => (
          <div key={h.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-sm tracking-widest text-primary">{h.acao}</p>
              <span className="text-xs text-muted-foreground">{dataHoraBr(h.created_at)}</span>
            </div>
            <p className="mt-2 text-sm">
              <Link
                to="/super-admin/clientes/$id"
                params={{ id: h.user_id }}
                className="underline decoration-primary/40 hover:text-primary"
              >
                {h.nome || "Cliente"}
              </Link>
              {h.barbearia && <span className="text-muted-foreground"> · {h.barbearia}</span>}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {h.novo_prazo ? `Prazo: ${h.novo_prazo} · ` : ""}
              {h.vencimento_anterior ? `antes ${dataHoraBr(h.vencimento_anterior)} → ` : ""}
              {h.novo_vencimento ? dataHoraBr(h.novo_vencimento) : ""}
            </p>
            {h.observacao && <p className="mt-1 text-xs">{h.observacao}</p>}
          </div>
        ))}
      </div>
    </SuperShell>
  );
}
