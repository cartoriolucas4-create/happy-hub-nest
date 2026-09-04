import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function PublicSetupGate({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bookingMatch = pathname.match(/^\/(?:barbearia\/)?([^/]+)\/agendar\/?$/);
  const legacyMatch = pathname.match(/^\/barbearia\/([^/]+)/);
  const slug = bookingMatch?.[1] ? decodeURIComponent(bookingMatch[1]) : legacyMatch?.[1] ? decodeURIComponent(legacyMatch[1]) : "";
  const isPublicShop = Boolean(slug);

  const { data, isLoading } = useQuery({
    queryKey: ["public-setup-gate", slug],
    enabled: isPublicShop,
    queryFn: async () => {
      const { data: shop, error: shopError } = await supabase.from("barbershops").select("id,nome").eq("slug", slug).maybeSingle();
      if (shopError) throw shopError;
      if (!shop) return null;
      const { data: operational, error } = await supabase.rpc("barbearia_operacional", { p_barbershop_id: shop.id });
      if (error) throw error;
      return { nome: shop.nome, operational: Boolean(operational) };
    },
    staleTime: 10_000,
  });

  if (!isPublicShop || isLoading || !data?.operational) {
    if (!isPublicShop || isLoading || !data) return <>{children}</>;
    return <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center text-foreground"><div className="max-w-md"><AlertTriangle className="mx-auto h-10 w-10 text-primary" aria-hidden="true"/><h1 className="mt-5 text-3xl">Esta barbearia ainda está configurando seu atendimento.</h1><p className="mt-3 text-sm text-muted-foreground">O site público ficará disponível assim que a configuração inicial for concluída.</p></div></div>;
  }

  return <>{children}</>;
}
