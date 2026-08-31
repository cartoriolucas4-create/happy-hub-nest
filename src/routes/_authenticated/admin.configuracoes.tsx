import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, btn, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";
import { ACCENT_OPTIONS, DEFAULT_ACCENT_DB_VALUE, DEFAULT_ACCENT_COLOR, accentForeground } from "@/lib/theme";
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
  nome: string; slug: string; responsavel: string; slogan: string; descricao: string; sobre_experiencia: string;
  telefone: string; whatsapp: string; email: string; endereco: string; numero: string; complemento: string;
  bairro: string; cidade: string; estado: string; cep: string; instagram: string; facebook: string; site_url: string;
  mensagem_whatsapp: string; logo_url: string; cover_url: string; cor_primaria: string;
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
      nome: shop.nome, slug: shop.slug, responsavel: shop.responsavel ?? "", slogan: shop.slogan ?? "", descricao: shop.descricao ?? "",
      sobre_experiencia: shop.sobre_experiencia ?? "", telefone: shop.telefone ?? "", whatsapp: shop.whatsapp ?? "", email: shop.email ?? "",
      endereco: shop.endereco ?? "", numero: shop.numero ?? "", complemento: shop.complemento ?? "", bairro: shop.bairro ?? "", cidade: shop.cidade ?? "",
      estado: shop.estado ?? "", cep: shop.cep ?? "", instagram: shop.instagram ?? "", facebook: shop.facebook ?? "", site_url: shop.site_url ?? "",
      mensagem_whatsapp: shop.mensagem_whatsapp ?? "", logo_url: shop.logo_url ?? "", cover_url: shop.cover_url ?? "",
      cor_primaria: shop.cor_primaria || DEFAULT_ACCENT_DB_VALUE,
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
      const { error } = await supabase.from("barbershops").update({
        nome: f.nome.trim(), slug, responsavel: t(f.responsavel), slogan: t(f.slogan), descricao: t(f.descricao),
        sobre_experiencia: t(f.sobre_experiencia), telefone: t(f.telefone), whatsapp: t(f.whatsapp), email: t(f.email),
        endereco: t(f.endereco), numero: t(f.numero), complemento: t(f.complemento), bairro: t(f.bairro), cidade: t(f.cidade),
        estado: t(f.estado), cep: t(f.cep), instagram: t(f.instagram), facebook: t(f.facebook), site_url: t(f.site_url),
        mensagem_whatsapp: t(f.mensagem_whatsapp), logo_url: t(f.logo_url), cover_url: t(f.cover_url), cor_primaria: f.cor_primaria,
      }).eq("id", shop!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Configurações salvas!"); qc.invalidateQueries({ queryKey: ["shop"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function enviarImagem(kind: "logo" | "capa", file: File | undefined) {
    if (!file || !form || !shop) return;
    setEnviando(kind);
    try {
      const path = await uploadMedia(shop.id, kind, file);
      const url = await mediaUrl(path);
      if (kind === "logo") { setForm({ ...form, logo_url: path }); setLogoPreview(url); }
      else { setForm({ ...form, cover_url: path }); setCoverPreview(url); }
      toast.success("Imagem enviada. Clique em salvar para publicar.");
    } catch (e) { toast.error((e as Error).message); }
    finally { setEnviando(null); }
  }

  if (!form) return <AdminShell title="Configurações">Carregando...</AdminShell>;

  const grupos: { titulo: string; campos: [keyof Form, string][] }[] = [
    { titulo: "Identificação", campos: [["nome", "Nome da barbearia"], ["slug", "Link público (/barbearia/...)"] , ["responsavel", "Responsável"]] },
    { titulo: "Contato", campos: [["telefone", "Telefone"], ["whatsapp", "WhatsApp (com DDD)"], ["email", "E-mail"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["site_url", "Site"]] },
    { titulo: "Endereço", campos: [["endereco", "Rua / Avenida"], ["numero", "Número"], ["complemento", "Complemento"], ["bairro", "Bairro"], ["cidade", "Cidade"], ["estado", "Estado"], ["cep", "CEP"]] },
  ];

  const selectedColor = form.cor_primaria || DEFAULT_ACCENT_DB_VALUE;
  const selectedOption = ACCENT_OPTIONS.find((option) => option.value === selectedColor) ?? ACCENT_OPTIONS[0]!;
  const previewColor = selectedColor === DEFAULT_ACCENT_DB_VALUE ? DEFAULT_ACCENT_COLOR : selectedColor;
  const previewForeground = accentForeground(previewColor);

  return (
    <AdminShell title="Configurações" subtitle="Dados exibidos na sua página pública">
      <form onSubmit={(e) => { e.preventDefault(); salvar.mutate(form); }} className="max-w-3xl space-y-8">
        {grupos.map((g) => <section key={g.titulo}><h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">{g.titulo}</h2><div className="grid gap-4 sm:grid-cols-2">{g.campos.map(([key, label]) => <label key={key}><span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span><input className={input} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}</div></section>)}

        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xs uppercase tracking-[0.2em] text-primary">Personalização</h2><h3 className="mt-2 text-2xl">Cor do Meu Link</h3><p className="mt-1 max-w-xl text-sm text-muted-foreground">Escolha a cor principal de destaque do seu Meu Link. O tema, conteúdo, horários, serviços e barbeiros permanecem preservados.</p></div><span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Selecionado: <strong className="text-foreground">{selectedOption.name}</strong></span></div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {ACCENT_OPTIONS.map((option) => { const isSelected = option.value === selectedColor; const displayColor = option.id === "default" ? DEFAULT_ACCENT_COLOR : option.value; const foreground = accentForeground(displayColor); return <button key={option.id} type="button" aria-pressed={isSelected} onClick={() => setForm({ ...form, cor_primaria: option.value })} className={`group rounded-lg border p-3 text-left transition-all ${isSelected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}><span className="relative flex h-12 w-full items-center justify-center rounded-md border border-black/10 shadow-sm" style={{ backgroundColor: displayColor, color: foreground }}>{isSelected && <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />}</span><span className="mt-2 flex items-center justify-between gap-2 text-sm font-medium">{option.name}{isSelected && <span className="text-xs text-primary">Selecionada</span>}</span></button>; })}
          </div>

          <div className="mt-6 rounded-lg border border-border bg-background p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Prévia do Meu Link</p><p className="mt-1 text-sm text-muted-foreground">Veja como a cor será aplicada nos principais destaques.</p></div><span className="text-xs text-muted-foreground">{selectedOption.name}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-md border border-border p-4"><p style={{ color: previewColor }} className="font-serif-display text-xl">Agende seu horário</p><p className="mt-1 text-xs text-muted-foreground">Título de destaque</p></div><div className="rounded-md border border-border p-4"><button type="button" style={{ backgroundColor: previewColor, color: previewForeground, borderColor: previewColor }} className="w-full rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-widest">Agendar agora</button><p className="mt-2 text-xs text-muted-foreground">Chamada para agendamento</p></div><div className="rounded-md border border-border p-4"><div style={{ borderColor: previewColor, color: previewColor }} className="rounded-md border p-3 text-xs"><span className="font-semibold">Horário selecionado</span><span className="mt-1 block text-muted-foreground">09:00 · 09:30 · 10:00</span></div><p className="mt-2 text-xs text-muted-foreground">Seleção e indicadores</p></div></div></div>

          <button type="button" disabled={salvar.isPending} className="mt-5 inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary disabled:opacity-60" onClick={() => { if (!window.confirm("Deseja restaurar a cor padrão?")) return; const next = { ...form, cor_primaria: DEFAULT_ACCENT_DB_VALUE }; setForm(next); salvar.mutate(next); }}><RotateCcw className="h-4 w-4" aria-hidden="true" />REDEFINIR PARA PADRÃO</button>
        </section>

        <section><h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">Textos</h2><div className="grid gap-4"><label><span className="text-xs uppercase tracking-widest text-muted-foreground">Slogan (frase de destaque no topo da página)</span><input className={input} placeholder="Precisão em cada detalhe." value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} /></label><label><span className="text-xs uppercase tracking-widest text-muted-foreground">Texto da seção “A experiência”</span><textarea rows={2} className={input} placeholder="Mais que um corte: ambiente reservado, bebida e cuidado do início ao fim." value={form.sobre_experiencia} onChange={(e) => setForm({ ...form, sobre_experiencia: e.target.value })} /></label><label><span className="text-xs uppercase tracking-widest text-muted-foreground">Descrição / sobre a barbearia</span><textarea rows={3} className={input} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></label><label><span className="text-xs uppercase tracking-widest text-muted-foreground">Mensagem inicial do botão WhatsApp</span><textarea rows={2} className={input} placeholder="Olá! Gostaria de saber mais sobre os serviços." value={form.mensagem_whatsapp} onChange={(e) => setForm({ ...form, mensagem_whatsapp: e.target.value })} /></label></div></section>

        <section><h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">Identidade visual</h2><div className="grid gap-6 sm:grid-cols-2"><div><span className="text-xs uppercase tracking-widest text-muted-foreground">Logo</span>{logoPreview && <img src={logoPreview} alt="Logo atual" className="mt-2 h-20 w-20 rounded-full border border-border object-cover" />}<input type="file" accept="image/*" disabled={enviando === "logo"} onChange={(e) => void enviarImagem("logo", e.target.files?.[0])} className="mt-2 block w-full text-sm text-muted-foreground" /></div><div><span className="text-xs uppercase tracking-widest text-muted-foreground">Imagem de capa</span>{coverPreview && <img src={coverPreview} alt="Capa atual" className="mt-2 h-20 w-full rounded-md border border-border object-cover" />}<input type="file" accept="image/*" disabled={enviando === "capa"} onChange={(e) => void enviarImagem("capa", e.target.files?.[0])} className="mt-2 block w-full text-sm text-muted-foreground" /></div></div></section>

        <button className={btn} disabled={salvar.isPending || Boolean(enviando)}>{salvar.isPending ? "SALVANDO..." : "SALVAR CONFIGURAÇÕES"}</button>
      </form>
    </AdminShell>
  );
}
