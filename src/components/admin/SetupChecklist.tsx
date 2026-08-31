import { Link } from "@tanstack/react-router";
import { AlertTriangle, Check } from "lucide-react";
import { useSetupStatus } from "@/lib/setup";

export function SetupChecklist({ shopId }: { shopId: string | null | undefined }) {
  const { data } = useSetupStatus(shopId);
  if (!data || data.completo) return null;
  const feitos = data.itens.filter((item) => item.ok).length;

  return (
    <section className="mb-8 rounded-lg border border-primary/40 bg-primary/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-display text-sm tracking-widest">CONFIGURAÇÃO INICIAL PENDENTE</h2>
            <p className="mt-1 text-sm text-muted-foreground">Complete os dados necessários para colocar sua barbearia em funcionamento.</p>
          </div>
        </div>
        <Link to="/admin/configurar" className="rounded-md bg-primary px-5 py-2.5 font-display text-xs tracking-widest text-primary-foreground hover:bg-primary/90">
          CONTINUAR CONFIGURAÇÃO
        </Link>
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full bg-primary transition-all" style={{ width: `${(feitos / 5) * 100}%` }} /></div>
      <p className="mt-2 text-xs text-muted-foreground">{feitos} de 5 etapas concluídas</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        {data.itens.map((item) => (
          <div key={item.key} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs">
            {item.ok ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <AlertTriangle className="h-3.5 w-3.5 text-primary" />}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
