import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Check, AlertTriangle, Share2 } from "lucide-react";
import { AdminShell, btn, btnGhost } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";
import { useSetupStatus } from "@/lib/setup";

export const Route = createFileRoute("/_authenticated/admin/meu-link")({
  head: () => ({
    meta: [
      { title: "Meu link | BarberFlow" },
      { name: "description", content: "Compartilhe o link de agendamento da sua barbearia." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MeuLink,
});

function MeuLink() {
  const { data: shop } = useShop();
  const { data: status } = useSetupStatus(shop?.id);
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const url = shop ? `${origin}/barbearia/${shop.slug}` : "";

  async function copiar() {
    if (!shop || !url) return;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  }

  async function compartilhar() {
    if (!shop || !url) return;
    if (navigator.share) {
      await navigator.share({ title: shop.nome, text: `Agende seu horário na ${shop.nome}.`, url });
      return;
    }
    await copiar();
  }

  if (!shop) {
    return (
      <AdminShell title="Meu link" subtitle="Divulgue no Instagram, WhatsApp e Google">
        <p>Carregando...</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Meu link" subtitle="Divulgue no Instagram, WhatsApp e Google">
      <div className="max-w-2xl space-y-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Seu link público</p>
          <p className="mt-2 break-all font-display text-2xl text-primary">{url}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className={btn} onClick={copiar}>
              <span className="flex items-center gap-2"><Copy className="h-4 w-4" />COPIAR LINK</span>
            </button>
            <button className={btnGhost} onClick={compartilhar}>
              <span className="flex items-center gap-2"><Share2 className="h-4 w-4" />COMPARTILHAR</span>
            </button>
            <Link to="/barbearia/$slug" params={{ slug: shop.slug }} target="_blank" className={btnGhost}>
              <span className="flex items-center gap-2"><ExternalLink className="h-4 w-4" />ABRIR SITE</span>
            </Link>
          </div>
        </div>

        {status && !status.completo && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display text-sm tracking-widest">CONFIGURAÇÃO AINDA NÃO CONCLUÍDA</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  O Meu Link continua disponível. Complete os itens abaixo para liberar o agendamento público.
                </p>
              </div>
            </div>
            <ul className="mt-5 space-y-2">
              {status.itens.map((item) => (
                <li key={item.key} className="flex items-center gap-2 text-sm">
                  {item.ok ? <Check className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-primary" />}
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
            <Link to="/admin/configurar" className="mt-6 inline-flex rounded-md bg-primary px-5 py-2.5 font-display text-xs tracking-widest text-primary-foreground">
              CONTINUAR CONFIGURAÇÃO
            </Link>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          <p className="text-foreground">Sugestão de mensagem para clientes:</p>
          <p className="mt-3">“Agende seu horário na {shop.nome} pelo link: {url} — rápido, online e 24 horas.”</p>
        </div>
      </div>
    </AdminShell>
  );
}
