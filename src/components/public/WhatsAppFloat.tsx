import { waLink, type ShopLike } from "@/lib/barber";

/** Botão flutuante que usa sempre o WhatsApp cadastrado pela barbearia acessada. */
export function WhatsAppFloat({ shop }: { shop: ShopLike }) {
  const href = waLink(shop);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Falar com ${shop.nome ?? "a barbearia"} no WhatsApp`}
      className="fixed bottom-24 right-4 z-50 block h-14 w-14 overflow-hidden rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition-transform hover:scale-105 active:scale-95 sm:bottom-8 sm:right-8 sm:h-16 sm:w-16"
    >
      <img
        src="/whatsapp-float.svg"
        alt=""
        className="h-full w-full object-cover"
        aria-hidden="true"
      />
    </a>
  );
}
