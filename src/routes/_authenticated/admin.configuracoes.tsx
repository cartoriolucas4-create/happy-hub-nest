import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, btn, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";
import { isEmail, slugify } from "@/lib/barber";
import { mediaUrl, uploadMedia } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | BarberFlow" },
      { name: "description", content: "Dados, contato, endereço e identidade visual da barbearia." },
      { property: "og:title", content: "Configurações | BarberFlow" },
      { property: "og:description", content: "Configurações da barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Configuracoes,
});

type Form = {
  nome: string;
  slug: string;
  responsavel: string;
  slogan: string;
  descricao: string;
  sobre_experiencia: string;
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  instagram: string;
  facebook: string;
  site_url: string;
  mensagem_whatsapp: string;
  logo_url: string;
  cover_url: string;
};

function Configuracoes() {
  const { data: shop } = useShop();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<"logo" | "capa" | null>(null);

  useEffect(() => {
    if (!shop) return;
    setForm({
      nome: shop.nome,
      slug: shop.slug,
      responsavel: shop.responsavel ?? "",
      slogan: shop.slogan ?? "",
      descricao: shop.descricao ?? "",
      sobre_experiencia: shop.sobre_experiencia ?? "",
      telefone: shop.telefone ?? "",
      whatsapp: shop.whatsapp ?? "",
      email: shop.email ?? "",
      endereco: shop.endereco ?? "",
      numero: shop.numero ?? "",
      complemento: shop.complemento ?? "",
      bairro: shop.bairro ?? "",
      cidade: shop.cidade ?? "",
      estado: shop.estado ?? "",
      cep: shop.cep ?? "",
      instagram: shop.instagram ?? "",
      facebook: shop.facebook ?? "",
      site_url: shop.site_url ?? "",
      mensagem_whatsapp: shop.mensagem_whatsapp ?? "",
      logo_url: shop.logo_url ?? "",
      cover_url: shop.cover_url ?? "",
    });
    void mediaUrl(shop.logo_url).then(setLogoPreview);
    void mediaUrl(shop.cover_url).then(setCoverPreview);
  }, [shop]);

  const salvar = useMutation({
    mutationFn: async (f: Form) => {
      const slug = slugify(f.slug);
      if (f.nome.trim().length < 2) throw new Error("Informe o nome da barbearia.");
      if (slug.length < 3) throw new Error("O link deve ter ao menos 3 caracteres.");
      if (slug !== shop!.slug) {
        const { data } = await supabase.rpc("slug_disponivel", { p_slug: slug });
        if (!data) throw new Error("Esse link já está em uso por outra barbearia.");
      }
      if (f.email && !isEmail(f.email)) throw new Error("E-mail inválido.");
      const t = (v: string) => v.trim() || null;
      const { error } = await supabase
        .from("barbershops")
        .update({
          nome: f.nome.trim(),
          slug,
          responsavel: t(f.responsavel),
          slogan: t(f.slogan),
          descricao: t(f.descricao),
          sobre_experiencia: t(f.sobre_experiencia),
          telefone: t(f.telefone),
          whatsapp: t(f.whatsapp),
          email: t(f.email),
          endereco: t(f.endereco),
          numero: t(f.numero),
          complemento: t(f.complemento),
          bairro: t(f.bairro),
          cidade: t(f.cidade),
          estado: t(f.estado),
          cep: t(f.cep),
          instagram: t(f.instagram),
          facebook: t(f.facebook),
          site_url: t(f.site_url),
          mensagem_whatsapp: t(f.mensagem_whatsapp),
          logo_url: t(f.logo_url),
          cover_url: t(f.cover_url),
        })
        .eq("id", shop!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas!");
      qc.invalidateQueries({ queryKey: ["shop"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function enviarImagem(kind: "logo" | "capa", file: File | undefined) {
    if (!file || !form || !shop) return;
    setEnviando(kind);
    try {
      const path = await uploadMedia(shop.id, kind, file);
      const url = await mediaUrl(path);
      if (kind === "logo") {
        setForm({ ...form, logo_url: path });
        setLogoPreview(url);
      } else {
        setForm({ ...form, cover_url: path });
        setCoverPreview(url);
      }
      toast.success("Imagem enviada. Clique em salvar para publicar.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(null);
    }
  }

  if (!form) return <AdminShell title="Configurações">Carregando...</AdminShell>;

  const grupos: { titulo: string; campos: [keyof Form, string][] }[] = [
    {
      titulo: "Identificação",
      campos: [
        ["nome", "Nome da barbearia"],
        ["slug", "Link público (/barbearia/...)"],
        ["responsavel", "Responsável"],
      ],
    },
    {
      titulo: "Contato",
      campos: [
        ["telefone", "Telefone"],
        ["whatsapp", "WhatsApp (com DDD)"],
        ["email", "E-mail"],
        ["instagram", "Instagram"],
        ["facebook", "Facebook"],
        ["site_url", "Site"],
      ],
    },
    {
      titulo: "Endereço",
      campos: [
        ["endereco", "Rua / Avenida"],
        ["numero", "Número"],
        ["complemento", "Complemento"],
        ["bairro", "Bairro"],
        ["cidade", "Cidade"],
        ["estado", "Estado"],
        ["cep", "CEP"],
      ],
    },
  ];

  return (
    <AdminShell title="Configurações" subtitle="Dados exibidos na sua página pública">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar.mutate(form);
        }}
        className="max-w-3xl space-y-8"
      >
        {grupos.map((g) => (
          <section key={g.titulo}>
            <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">{g.titulo}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {g.campos.map(([key, label]) => (
                <label key={key}>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
                  <input
                    className={input}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </label>
              ))}
            </div>
          </section>
        ))}

        <section>
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">Textos</h2>
          <div className="grid gap-4">
            <label>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Descrição / sobre a barbearia
              </span>
              <textarea
                rows={3}
                className={input}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </label>
            <label>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Mensagem inicial do botão WhatsApp
              </span>
              <textarea
                rows={2}
                className={input}
                placeholder="Olá! Gostaria de saber mais sobre os serviços."
                value={form.mensagem_whatsapp}
                onChange={(e) => setForm({ ...form, mensagem_whatsapp: e.target.value })}
              />
            </label>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">Identidade visual</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Logo</span>
              {logoPreview && (
                <img
                  src={logoPreview}
                  alt="Logo atual"
                  className="mt-2 h-20 w-20 rounded-full border border-border object-cover"
                />
              )}
              <input
                type="file"
                accept="image/*"
                disabled={enviando === "logo"}
                onChange={(e) => void enviarImagem("logo", e.target.files?.[0])}
                className="mt-2 block w-full text-sm text-muted-foreground"
              />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Imagem de capa</span>
              {coverPreview && (
                <img
                  src={coverPreview}
                  alt="Capa atual"
                  className="mt-2 h-20 w-full rounded-md border border-border object-cover"
                />
              )}
              <input
                type="file"
                accept="image/*"
                disabled={enviando === "capa"}
                onChange={(e) => void enviarImagem("capa", e.target.files?.[0])}
                className="mt-2 block w-full text-sm text-muted-foreground"
              />
            </div>
          </div>
        </section>

        <button className={btn} disabled={salvar.isPending || Boolean(enviando)}>
          {salvar.isPending ? "SALVANDO..." : "SALVAR CONFIGURAÇÕES"}
        </button>
      </form>
    </AdminShell>
  );
}
