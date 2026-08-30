import { supabase } from "@/integrations/supabase/client";

const BUCKET = "barbershop-media";

/** Aceita URL externa ou caminho no storage e devolve uma URL exibível. */
export async function mediaUrl(value: string | null | undefined) {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(v, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

/** Envia a imagem para a pasta da própria barbearia e devolve o caminho salvo. */
export async function uploadMedia(shopId: string, kind: "logo" | "capa", file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Envie um arquivo de imagem.");
  if (file.size > 5 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 5 MB.");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${shopId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return path;
}
