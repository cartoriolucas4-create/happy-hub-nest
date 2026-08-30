import { MessageCircle } from "lucide-react";
import { waLink, type ShopLike } from "@/lib/barber";

/** Botão flutuante que usa SEMPRE o WhatsApp cadastrado pela barbearia acessada. */
export function WhatsAppFloat({ shop }: { shop: ShopLike }) {
  const href = waLink(shop);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Falar com ${shop.nome ?? "a barbearia"} no WhatsApp`}
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-600 sm:h-16 sm:w-16"
    >
      <MessageCircle className="h-7 w-7" aria-hidden="true" />
    </a>
  );
}
