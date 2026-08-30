import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, Empty, btnGhost, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";
import { mediaUrl, uploadMedia } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/admin/galeria")({
  head: () => ({
    meta: [
      { title: "Galeria | BarberFlow" },
      { name: "description", content: "Fotos dos trabalhos exibidas na página pública." },
      { property: "og:title", content: "Galeria | BarberFlow" },
      { property: "og:description", content: "Gerencie as fotos da sua barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Galeria,
});

type Row = { id: string; path: string; descricao: string | null; ordem: number; url: string | null };

function Galeria() {
  const { data: shop } = useShop();
  const qc = useQueryClient();
  const [enviando, setEnviando] = useState(false);

  const { data: fotos = [], isLoading } = useQuery({
    queryKey: ["galeria-admin", shop?.id],
    enabled: Boolean(shop?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("id, path, descricao, ordem")
        .eq("barbershop_id", shop!.id)
        .order("ordem")
        .order("created_at");
      if (error) throw error;
      return Promise.all(
        (data ?? []).map(async (r) => ({ ...r, url: await mediaUrl(r.path) }) as Row),
      );
    },
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["galeria-admin"] });
    qc.invalidateQueries({ queryKey: ["public-shop"] });
  };

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gallery_images").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Foto removida.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atualizar = useMutation({
    mutationFn: async (v: { id: string; descricao?: string | null; ordem?: number }) => {
      const { id, ...campos } = v;
      const { error } = await supabase.from("gallery_images").update(campos).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  async function enviar(files: FileList | null) {
    if (!files?.length || !shop) return;
    setEnviando(true);
    try {
      let ordem = fotos.length;
      for (const file of Array.from(files)) {
        const path = await uploadMedia(shop.id, "galeria", file);
        const { error } = await supabase
          .from("gallery_images")
          .insert({ barbershop_id: shop.id, path, ordem: ordem++ });
        if (error) throw error;
      }
      toast.success("Fotos publicadas na sua página.");
      invalidar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  function mover(i: number, dir: -1 | 1) {
    const a = fotos[i];
    const b = fotos[i + dir];
    if (!a || !b) return;
    atualizar.mutate({ id: a.id, ordem: b.ordem });
    atualizar.mutate({ id: b.id, ordem: a.ordem });
  }

  return (
    <AdminShell title="Galeria" subtitle="Fotos dos seus trabalhos na página pública">
      <label className="block rounded-lg border border-dashed border-border p-8 text-center">
        <span className="text-sm text-muted-foreground">
          {enviando ? "Enviando..." : "Selecione imagens (até 5 MB cada)"}
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={enviando || !shop}
          onChange={(e) => void enviar(e.target.files)}
          className="mt-4 block w-full text-sm text-muted-foreground"
        />
      </label>

      <p className="mt-4 text-xs text-muted-foreground">
        Sem fotos próprias, sua página exibe imagens padrão de alto padrão automaticamente.
      </p>

      <div className="mt-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : fotos.length === 0 ? (
          <Empty>Nenhuma foto enviada ainda.</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fotos.map((f, i) => (
              <div key={f.id} className="overflow-hidden rounded-lg border border-border bg-card">
                {f.url && <img src={f.url} alt={f.descricao ?? ""} className="h-44 w-full object-cover" />}
                <div className="space-y-3 p-4">
                  <input
                    className={input}
                    placeholder="Legenda (opcional)"
                    defaultValue={f.descricao ?? ""}
                    onBlur={(e) =>
                      atualizar.mutate({ id: f.id, descricao: e.target.value.trim() || null })
                    }
                  />
                  <div className="flex gap-2">
                    <button className={btnGhost} onClick={() => mover(i, -1)} aria-label="Subir">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button className={btnGhost} onClick={() => mover(i, 1)} aria-label="Descer">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      className={`${btnGhost} ml-auto hover:border-destructive hover:text-destructive`}
                      onClick={() => remover.mutate(f.id)}
                      aria-label="Remover foto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
