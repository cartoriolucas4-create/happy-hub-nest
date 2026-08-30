import { MessageCircle } from "lucide-react";
import { waLink, type ShopLike } from "@/lib/barber";

/** Botão flutuante premium que usa SEMPRE o WhatsApp cadastrado pela barbearia acessada. */
export function WhatsAppFloat({ shop }: { shop: ShopLike }) {
  const href = waLink(shop);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Falar com ${shop.nome ?? "a barbearia"} no WhatsApp`}
      className="fixed bottom-24 right-4 z-50 flex h-13 w-13 items-center justify-center rounded-full border border-primary/40 bg-card/90 text-primary shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur transition hover:border-primary hover:bg-primary hover:text-primary-foreground sm:bottom-8 sm:right-8 sm:h-14 sm:w-14"
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
    </a>
  );
}
