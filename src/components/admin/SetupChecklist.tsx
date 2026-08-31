import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";
import { useSetupStatus } from "@/lib/setup";

/**
 * Painel de configuração inicial. Aparece somente no Dashboard e desaparece
 * automaticamente quando todos os requisitos mínimos estão atendidos.
 */
export function SetupChecklist({ shopId }: { shopId: string | null | undefined }) {
  const { data } = useSetupStatus(shopId);
  if (!data || data.completo) return null;

  const total = data.itens.length;
  const feitos = total - data.pendentes.length;
  const primeiro = data.pendentes[0]!;

  return (
    <section className="mb-8 rounded-lg border border-primary/40 bg-primary/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-display text-sm tracking-widest">CONFIGURAÇÃO INICIAL PENDENTE</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete as configurações necessárias para começar a utilizar sua barbearia.
            </p>
          </div>
        </div>
        <Link
          to={primeiro.to}
          className="rounded-md bg-primary px-5 py-2.5 font-display text-xs tracking-widest text-primary-foreground hover:bg-primary/90"
        >
          COMEÇAR CONFIGURAÇÃO
        </Link>
      </div>

      <div className="mt-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(feitos / total) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {feitos} de {total} itens concluídos
        </p>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {data.itens.map((item) => (
          <li key={item.key}>
            <Link
              to={item.to}
              className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                item.ok
                  ? "border-emerald-500/30 bg-emerald-500/10 text-foreground"
                  : "border-border bg-card hover:border-primary"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  item.ok ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/15 text-primary"
                }`}
              >
                {item.ok ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </span>
              <span className="flex-1">
                <span className="block">{item.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {item.ok ? "Concluído" : item.descricao}
                </span>
              </span>
              {!item.ok && <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
