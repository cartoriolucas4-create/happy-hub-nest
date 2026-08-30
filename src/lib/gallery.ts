import { supabase } from "@/integrations/supabase/client";
import { mediaUrl } from "@/lib/media";

import g1 from "@/assets/lux-g1.jpg";
import g2 from "@/assets/lux-g2.jpg";
import g3 from "@/assets/lux-g3.jpg";
import g4 from "@/assets/lux-g4.jpg";

export type GalleryItem = { id: string; url: string; descricao: string | null };

/** Imagens padrão premium usadas quando a barbearia ainda não cadastrou as suas. */
export const GALERIA_PADRAO: GalleryItem[] = [
  { id: "d1", url: g1, descricao: "Acabamento na máquina" },
  { id: "d2", url: g2, descricao: "Ferramentas do ofício" },
  { id: "d3", url: g3, descricao: "Fade e barba desenhada" },
  { id: "d4", url: g4, descricao: "Nosso ambiente" },
];

export async function fetchGaleria(barbershopId: string): Promise<GalleryItem[]> {
  const { data } = await supabase
    .from("gallery_images")
    .select("id, path, descricao, ordem")
    .eq("barbershop_id", barbershopId)
    .order("ordem")
    .order("created_at");
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const urls = await Promise.all(rows.map((r) => mediaUrl(r.path)));
  return rows
    .map((r, i) => ({ id: r.id, url: urls[i] ?? "", descricao: r.descricao }))
    .filter((r) => Boolean(r.url));
}
