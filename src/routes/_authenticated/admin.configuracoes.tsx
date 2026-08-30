import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, btn, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";
import { isEmail, slugify } from "@/lib/barber";

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
  descricao: string;
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: string;
  cidade: string;
  estado: string;
  instagram: string;
  facebook: string;
  logo_url: string;
  cover_url: string;
};

function Configuracoes() {
  const { data: shop } = useShop();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);

  useEffect(() => {
    if (!shop) return;
    setForm({
      nome: shop.nome,
      slug: shop.slug,
      descricao: shop.descricao ?? "",
      telefone: shop.telefone ?? "",
      whatsapp: shop.whatsapp ?? "",
      email: shop.email ?? "",
      endereco: shop.endereco ?? "",
      cidade: shop.cidade ?? "",
      estado: shop.estado ?? "",
      instagram: shop.instagram ?? "",
      facebook: shop.facebook ?? "",
      logo_url: shop.logo_url ?? "",
      cover_url: shop.cover_url ?? "",
    });
  }, [shop]);

  const salvar = useMutation({
    mutationFn: async (f: Form) => {
      const slug = slugify(f.slug);
      if (slug.length < 3) throw new Error("O link deve ter ao menos 3 caracteres.");
      if (slug !== shop!.slug) {
        const { data } = await supabase.rpc("slug_disponivel", { p_slug: slug });
        if (!data) throw new Error("Esse link já está em uso por outra barbearia.");
      }
      if (f.email && !isEmail(f.email)) throw new Error("E-mail inválido.");
      const { error } = await supabase
        .from("barbershops")
        .update({
          nome: f.nome.trim(),
          slug,
          descricao: f.descricao.trim() || null,
          telefone: f.telefone.trim() || null,
          whatsapp: f.whatsapp.trim() || null,
          email: f.email.trim() || null,
          endereco: f.endereco.trim() || null,
          cidade: f.cidade.trim() || null,
          estado: f.estado.trim() || null,
          instagram: f.instagram.trim() || null,
          facebook: f.facebook.trim() || null,
          logo_url: f.logo_url.trim() || null,
          cover_url: f.cover_url.trim() || null,
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

  if (!form) return <AdminShell title="Configurações">Carregando...</AdminShell>;

  const campos: [keyof Form, string][] = [
    ["nome", "Nome da barbearia"],
    ["slug", "Link público (/barbearia/...)"],
    ["telefone", "Telefone"],
    ["whatsapp", "WhatsApp"],
    ["email", "E-mail"],
    ["endereco", "Endereço"],
    ["cidade", "Cidade"],
    ["estado", "Estado"],
    ["instagram", "Instagram"],
    ["facebook", "Facebook"],
    ["logo_url", "URL da logo"],
    ["cover_url", "URL da imagem de capa"],
  ];

  return (
    <AdminShell title="Configurações" subtitle="Dados exibidos na sua página pública">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar.mutate(form);
        }}
        className="grid max-w-3xl gap-4 sm:grid-cols-2"
      >
        {campos.map(([key, label]) => (
          <label key={key}>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
            <input className={input} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </label>
        ))}
        <label className="sm:col-span-2">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Descrição</span>
          <textarea
            rows={3}
            className={input}
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          />
        </label>
        <div className="sm:col-span-2">
          <button className={btn} disabled={salvar.isPending}>
            {salvar.isPending ? "SALVANDO..." : "SALVAR CONFIGURAÇÕES"}
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
