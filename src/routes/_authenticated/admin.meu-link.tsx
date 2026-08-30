import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { AdminShell, btn, btnGhost } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/admin/meu-link")({
  head: () => ({
    meta: [
      { title: "Meu link | BarberFlow" },
      { name: "description", content: "Compartilhe o link de agendamento da sua barbearia." },
      { property: "og:title", content: "Meu link | BarberFlow" },
      { property: "og:description", content: "Link exclusivo de agendamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MeuLink,
});

function MeuLink() {
  const { data: shop } = useShop();
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const url = shop ? `${origin}/barbearia/${shop.slug}` : "";

  async function copiar() {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  }

  return (
    <AdminShell title="Meu link" subtitle="Divulgue no Instagram, WhatsApp e Google">
      {!shop ? (
        <p>Carregando...</p>
      ) : (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Seu link público</p>
            <p className="mt-2 break-all font-display text-2xl text-primary">{url}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className={btn} onClick={copiar}>
                <span className="flex items-center gap-2">
                  <Copy className="h-4 w-4" /> COPIAR LINK
                </span>
              </button>
              <Link
                to="/barbearia/$slug"
                params={{ slug: shop.slug }}
                target="_blank"
                className={btnGhost}
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" /> Abrir página
                </span>
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            <p className="text-foreground">Sugestão de mensagem para clientes:</p>
            <p className="mt-3">
              “Agende seu horário na {shop.nome} pelo link: {url} — rápido, online e 24 horas.”
            </p>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
