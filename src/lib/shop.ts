import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/barber";
import { getAuthenticatedArea } from "@/lib/auth-area";

/**
 * Carrega a barbearia do usuário logado. Se ainda não existir, cria a partir
 * dos dados informados no cadastro (metadata do usuário).
 */
export async function loadOrCreateShop() {
  const session = await getAuthenticatedArea();
  if (!session || session.area === "super-admin") return null;
  const user = session.user;

  const existing = await supabase
    .from("barbershops")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const meta = (user.user_metadata ?? {}) as Record<string, string>;
  const nome = meta["barbershop_nome"] || "Minha Barbearia";
  const baseSlug = slugify(meta["barbershop_slug"] || nome) || "barbearia";
  let slug = baseSlug;

  // Reserve the requested slug when available. If another account wins the
  // race between this check and the insert, retry with a deterministic suffix.
  const livre = await supabase.rpc("slug_disponivel", { p_slug: slug });
  if (!livre.error && livre.data === false) {
    slug = `${baseSlug}-${user.id.slice(0, 8)}`;
  }

  let created = await supabase
    .from("barbershops")
    .insert({
      owner_id: user.id,
      nome,
      slug,
      telefone: meta["telefone"] ?? null,
      whatsapp: meta["telefone"] ?? null,
      email: user.email ?? null,
    })
    .select("*")
    .single();

  // The database unique index is the final authority. If a concurrent signup
  // still claimed the same slug, retry once with the full user id suffix.
  if (created.error && (created.error.code === "23505" || /duplicate key|unique/i.test(created.error.message))) {
    const fallbackSlug = `${baseSlug}-${user.id}`;
    created = await supabase
      .from("barbershops")
      .insert({
        owner_id: user.id,
        nome,
        slug: fallbackSlug,
        telefone: meta["telefone"] ?? null,
        whatsapp: meta["telefone"] ?? null,
        email: user.email ?? null,
      })
      .select("*")
      .single();
  }

  if (created.error) throw created.error;
  return created.data;
}

export function useShop() {
  return useQuery({ queryKey: ["shop"], queryFn: loadOrCreateShop, staleTime: 30_000 });
}

export function useShopId() {
  const { data } = useShop();
  return data?.id ?? null;
}
