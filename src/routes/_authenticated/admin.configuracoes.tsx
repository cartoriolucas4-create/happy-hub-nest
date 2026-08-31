import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, RotateCcw, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, btn, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";
import { ACCENT_OPTIONS, DEFAULT_ACCENT_DB_VALUE, DEFAULT_ACCENT_COLOR, accentForeground } from "@/lib/theme";
import { isEmail, slugify } from "@/lib/barber";
import { mediaUrl, uploadMedia } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações | BarberFlow" }, { name: "description", content: "Dados, contato, endereço e identidade visual da barbearia." }, { property: "og:title", content: "Configurações | BarberFlow" }, { property: "og:description", content: "Configurações da barbearia." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: Configuracoes,
});

type PageColorOption = { id: string; name: string; value: string };
const DEFAULT_PAGE_COLOR = "#000000";
const LEGACY_PAGE_COLOR = "#1b1714";
const PAGE_COLOR_OPTIONS: PageColorOption[] = [
  { id: "default", name: "Padrão", value: DEFAULT_PAGE_COLOR },
  { id: "black", name: "Preto", value: "#090909" },
  { id: "graphite", name: "Grafite", value: "#171717" },
  { id: "slate", name: "Chumbo", value: "#20242a" },
  { id: "navy", name: "Azul-noite", value: "#101827" },
  { id: "wine", name: "Vinho", value: "#24161b" },
  { id: "green", name: "Verde-escuro", value: "#132019" },
  { id: "brown", name: "Marrom", value: "#2a211c" },
  { id: "steel", name: "Cinza-azulado", value: "#1b222b" },
  { id: "deep", name: "Cinza profundo", value: "#111315" },
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
function normalizeHex(value: string, fallback: string) {
  const next = value.trim();
  return HEX_RE.test(next) ? next.toUpperCase() : fallback;
}

function colorLabel(value: string, options: { value: string; name: string }[], fallback: string) {
  return options.find((option) => option.value.toLowerCase() === value.toLowerCase())?.name ?? fallback;
}

type Form = { nome: string; slug: string; responsavel: string; slogan: string; descricao: string; sobre_experiencia: string; telefone: string; whatsapp: string; email: string; endereco: string; numero: string; complemento: string; bairro: string; cidade: string; estado: string; cep: string; instagram: string; facebook: string; site_url: string; mensagem_whatsapp: string; logo_url: string; cover_url: string; cor_primaria: string; cor_secundaria: string; };

function Configuracoes() {
  const { data: shop } = useShop();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<"logo" | "capa" | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shop) return;
    const pageColor = shop.cor_secundaria === LEGACY_PAGE_COLOR ? DEFAULT_PAGE_COLOR : shop.cor_secundaria || DEFAULT_PAGE_COLOR;
    setForm({ nome: shop.nome, slug: shop.slug, responsavel: shop.responsavel ?? "", slogan: shop.slogan ?? "", descricao: shop.descricao ?? "", sobre_experiencia: shop.sobre_experiencia ?? "", telefone: shop.telefone ?? "", whatsapp: shop.whatsapp ?? "", email: shop.email ?? "", endereco: shop.endereco ?? "", numero: shop.numero ?? "", complemento: shop.complemento ?? "", bairro: shop.bairro ?? "", cidade: shop.cidade ?? "", estado: shop.estado ?? "", cep: shop.cep ?? "", instagram: shop.instagram ?? "", facebook: shop.facebook ?? "", site_url: shop.site_url ?? "", mensagem_whatsapp: shop.mensagem_whatsapp ?? "", logo_url: shop.logo_url ?? "", cover_url: shop.cover_url ?? "", cor_primaria: shop.cor_primaria || DEFAULT_ACCENT_DB_VALUE, cor_secundaria: pageColor });
    void mediaUrl(shop.logo_url).then(setLogoPreview);
    void mediaUrl(shop.cover_url).then(setCoverPreview);
  }, [shop]);

  const salvar = useMutation({
    mutationFn: async (f: Form) => {
      const slug = slugify(f.slug);
      if (f.nome.trim().length < 2) throw new Error("Informe o nome da barbearia.");
      if (slug.length < 3) throw new Error("O link deve ter ao menos 3 caracteres.");
      if (slug !== shop!.slug) { const { data } = await supabase.rpc("slug_disponivel", { p_slug: slug }); if (!data) throw new Error("Esse link já está em uso por outra barbearia."); }
      if (f.email && !isEmail(f.email)) throw new Error("E-mail inválido.");
      const corPrimaria = f.cor_primaria === DEFAULT_ACCENT_DB_VALUE ? DEFAULT_ACCENT_DB_VALUE : normalizeHex(f.cor_primaria, DEFAULT_ACCENT_COLOR);
      const corSecundaria = normalizeHex(f.cor_secundaria, DEFAULT_PAGE_COLOR);
      const t = (v: string) => v.trim() || null;
      const { error } = await supabase.from("barbershops").update({ nome: f.nome.trim(), slug, responsavel: t(f.responsavel), slogan: t(f.slogan), descricao: t(f.descricao), sobre_experiencia: t(f.sobre_experiencia), telefone: t(f.telefone), whatsapp: t(f.whatsapp), email: t(f.email), endereco: t(f.endereco), numero: t(f.numero), complemento: t(f.complemento), bairro: t(f.bairro), cidade: t(f.cidade), estado: t(f.estado), cep: t(f.cep), instagram: t(f.instagram), facebook: t(f.facebook), site_url: t(f.site_url), mensagem_whatsapp: t(f.mensagem_whatsapp), logo_url: t(f.logo_url), cover_url: t(f.cover_url), cor_primaria: corPrimaria, cor_secundaria: corSecundaria }).eq("id", shop!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Configurações salvas!"); qc.invalidateQueries({ queryKey: ["shop"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function enviarImagem(kind: "logo" | "capa", file: File | undefined) {
    if (!file || !form || !shop) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem válida."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 5 MB."); return; }
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

  function removerImagem(kind: "logo" | "capa") {
    if (!form) return;
    const isLogo = kind === "logo";
    if (isLogo) { setLogoPreview(null); setForm({ ...form, logo_url: "" }); if (logoInputRef.current) logoInputRef.current.value = ""; }
    else { setCoverPreview(null); setForm({ ...form, cover_url: "" }); if (coverInputRef.current) coverInputRef.current.value = ""; }
    toast.success(`${isLogo ? "Logo" : "Capa"} removida. Clique em salvar para publicar.`);
  }

  if (!form) return <AdminShell title="Configurações">Carregando...</AdminShell>;
  const grupos: { titulo: string; campos: [keyof Form, string][] }[] = [
    { titulo: "Identificação", campos: [["nome", "Nome da barbearia"], ["slug", "Link público (/barbearia/...)"] , ["responsavel", "Responsável"]] },
    { titulo: "Contato", campos: [["telefone", "Telefone"], ["whatsapp", "WhatsApp (com DDD)"], ["email", "E-mail"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["site_url", "Site"]] },
    { titulo: "Endereço", campos: [["endereco", "Rua / Avenida"], ["numero", "Número"], ["complemento", "Complemento"], ["bairro", "Bairro"], ["cidade", "Cidade"], ["estado", "Estado"], ["cep", "CEP"]] },
  ];
  const selectedColor = form.cor_primaria || DEFAULT_ACCENT_DB_VALUE;
  const selectedOptionName = selectedColor === DEFAULT_ACCENT_DB_VALUE ? "Padrão" : colorLabel(selectedColor, ACCENT_OPTIONS, "Personalizada");
  const previewColor = selectedColor === DEFAULT_ACCENT_DB_VALUE ? DEFAULT_ACCENT_COLOR : normalizeHex(selectedColor, DEFAULT_ACCENT_COLOR);
  const previewForeground = accentForeground(previewColor);
  const selectedPageColor = normalizeHex(form.cor_secundaria, DEFAULT_PAGE_COLOR);
  const selectedPageOptionName = colorLabel(selectedPageColor, PAGE_COLOR_OPTIONS, "Personalizada");
  const pageForeground = accentForeground(selectedPageColor);
  const atualizarCor = (campo: "cor_primaria" | "cor_secundaria", value: string) => setForm({ ...form, [campo]: normalizeHex(value, campo === "cor_primaria" ? DEFAULT_ACCENT_COLOR : DEFAULT_PAGE_COLOR) });

  return (
    <AdminShell title="Configurações" subtitle="Dados exibidos na sua página pública">
      <form onSubmit={(e) => { e.preventDefault(); salvar.mutate(form); }} className="max-w-3xl space-y-8">
        {grupos.map((g) => <section key={g.titulo}><h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">{g.titulo}</h2><div className="grid gap-4 sm:grid-cols-2">{g.campos.map(([key, label]) => <label key={key}><span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span><input className={input} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}</div></section>)}

        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xs uppercase tracking-[0.2em] text-primary">Personalização</h2><h3 className="mt-2 text-2xl">Cor do Meu Link</h3><p className="mt-1 max-w-xl text-sm text-muted-foreground">Escolha a cor principal de destaque do seu Meu Link. O tema, conteúdo, horários, serviços e barbeiros permanecem preservados.</p></div><span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Selecionado: <strong className="text-foreground">{selectedOptionName}</strong></span></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{ACCENT_OPTIONS.map((option) => { const isSelected = option.value === selectedColor; const displayColor = option.id === "default" ? DEFAULT_ACCENT_COLOR : option.value; const foreground = accentForeground(displayColor); return <button key={option.id} type="button" aria-pressed={isSelected} onClick={() => setForm({ ...form, cor_primaria: option.value })} className={`group rounded-lg border p-3 text-left transition-all ${isSelected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}><span className="relative flex h-12 w-full items-center justify-center rounded-md border border-black/10 shadow-sm" style={{ backgroundColor: displayColor, color: foreground }}>{isSelected && <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />}</span><span className="mt-2 flex items-center justify-between gap-2 text-sm font-medium">{option.name}{isSelected && <span className="text-xs text-primary">Selecionada</span>}</span></button>; })}</div>
          <div className="mt-4 rounded-lg border border-border bg-background p-4"><div className="flex flex-wrap items-end gap-4"><label className="flex items-center gap-3"><span className="text-xs uppercase tracking-wider text-muted-foreground">Paleta personalizada</span><input aria-label="Escolher cor do Meu Link" type="color" value={previewColor} onChange={(e) => atualizarCor("cor_primaria", e.target.value)} className="h-11 w-16 cursor-pointer rounded border border-border bg-transparent p-1" /></label><label className="min-w-[180px] flex-1"><span className="text-xs uppercase tracking-wider text-muted-foreground">Código HEX</span><input aria-label="Código HEX da cor do Meu Link" value={selectedColor === DEFAULT_ACCENT_DB_VALUE ? DEFAULT_ACCENT_COLOR : selectedColor} onChange={(e) => setForm({ ...form, cor_primaria: e.target.value })} onBlur={() => atualizarCor("cor_primaria", form.cor_primaria)} placeholder="#C9A96E" className={input} maxLength={7} /></label></div><p className="mt-2 text-xs text-muted-foreground">Escolha qualquer cor. O dourado atual continua sendo o padrão.</p></div>
          <div className="mt-6 rounded-lg border border-border bg-background p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Prévia do Meu Link</p><p className="mt-1 text-sm text-muted-foreground">Veja como a cor será aplicada nos principais destaques.</p></div><span className="text-xs text-muted-foreground">{selectedOptionName}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-md border border-border p-4"><p style={{ color: previewColor }} className="font-serif-display text-xl">Agende seu horário</p><p className="mt-1 text-xs text-muted-foreground">Título de destaque</p></div><div className="rounded-md border border-border p-4"><button type="button" style={{ backgroundColor: previewColor, color: previewForeground, borderColor: previewColor }} className="w-full rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-widest">Agendar agora</button><p className="mt-2 text-xs text-muted-foreground">Chamada para agendamento</p></div><div className="rounded-md border border-border p-4"><div style={{ borderColor: previewColor, color: previewColor }} className="rounded-md border p-3 text-xs"><span className="font-semibold">Horário selecionado</span><span className="mt-1 block text-muted-foreground">09:00 · 09:30 · 10:00</span></div><p className="mt-2 text-xs text-muted-foreground">Seleção e indicadores</p></div></div></div>
          <button type="button" disabled={salvar.isPending} className="mt-5 inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary disabled:opacity-60" onClick={() => { if (!window.confirm("Deseja restaurar a cor padrão do Meu Link?")) return; const next = { ...form, cor_primaria: DEFAULT_ACCENT_DB_VALUE }; setForm(next); salvar.mutate(next); }}><RotateCcw className="h-4 w-4" aria-hidden="true" />REDEFINIR COR DO MEU LINK</button>

          <div className="my-8 border-t border-border/70" />

          <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-2xl">Cor da Página</h3><p className="mt-1 max-w-xl text-sm text-muted-foreground">Escolha a cor de fundo principal do seu Meu Link. O conteúdo, imagens, horários, serviços e barbeiros continuam iguais.</p></div><span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Selecionado: <strong className="text-foreground">{selectedPageOptionName}</strong></span></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{PAGE_COLOR_OPTIONS.map((option) => { const isSelected = option.value.toLowerCase() === selectedPageColor.toLowerCase(); const foreground = accentForeground(option.value); return <button key={option.id} type="button" aria-pressed={isSelected} onClick={() => setForm({ ...form, cor_secundaria: option.value })} className={`group rounded-lg border p-3 text-left transition-all ${isSelected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}><span className="relative flex h-12 w-full items-center justify-center rounded-md border border-white/10 shadow-sm" style={{ backgroundColor: option.value, color: foreground }}>{isSelected && <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />}</span><span className="mt-2 flex items-center justify-between gap-2 text-sm font-medium">{option.name}{isSelected && <span className="text-xs text-primary">Selecionada</span>}</span></button>; })}</div>
          <div className="mt-4 rounded-lg border border-border bg-background p-4"><div className="flex flex-wrap items-end gap-4"><label className="flex items-center gap-3"><span className="text-xs uppercase tracking-wider text-muted-foreground">Paleta personalizada</span><input aria-label="Escolher cor da página" type="color" value={selectedPageColor} onChange={(e) => atualizarCor("cor_secundaria", e.target.value)} className="h-11 w-16 cursor-pointer rounded border border-border bg-transparent p-1" /></label><label className="min-w-[180px] flex-1"><span className="text-xs uppercase tracking-wider text-muted-foreground">Código HEX</span><input aria-label="Código HEX da cor da página" value={selectedPageColor} onChange={(e) => setForm({ ...form, cor_secundaria: e.target.value })} onBlur={() => atualizarCor("cor_secundaria", form.cor_secundaria)} placeholder="#000000" className={input} maxLength={7} /></label></div><p className="mt-2 text-xs text-muted-foreground">O padrão agora é preto 100%: #000000.</p></div>
          <div className="mt-6 rounded-lg border border-border bg-background p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Prévia da Página</p><p className="mt-1 text-sm text-muted-foreground">Uma visualização rápida de como o fundo ficará no Meu Link.</p></div><span className="text-xs text-muted-foreground">{selectedPageOptionName}</span></div><div className="mt-4 overflow-hidden rounded-md border border-border" style={{ backgroundColor: selectedPageColor, color: pageForeground }}><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><span className="font-serif-display text-lg">Minha Barbearia</span><span className="text-[0.6rem] uppercase tracking-[0.2em] opacity-70">Meu Link</span></div><div className="p-5"><p className="text-[0.65rem] uppercase tracking-[0.3em] opacity-70">Agendamento online</p><p className="mt-2 font-serif-display text-2xl">Seu estilo começa aqui.</p><div className="mt-4 flex gap-2"><span className="rounded border px-3 py-2 text-[0.65rem] uppercase tracking-wider" style={{ borderColor: previewColor, color: previewColor }}>Serviços</span><span className="rounded px-3 py-2 text-[0.65rem] uppercase tracking-wider" style={{ backgroundColor: previewColor, color: previewForeground }}>Agendar agora</span></div></div></div></div>
          <button type="button" disabled={salvar.isPending} className="mt-5 inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary disabled:opacity-60" onClick={() => { if (!window.confirm("Deseja restaurar a cor padrão da página?")) return; const next = { ...form, cor_secundaria: DEFAULT_PAGE_COLOR }; setForm(next); salvar.mutate(next); }}><RotateCcw className="h-4 w-4" aria-hidden="true" />REDEFINIR COR DA PÁGINA</button>
        </section>

        <section><h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">Textos</h2><div className="grid gap-4"><label><span className="text-xs uppercase tracking-widest text-muted-foreground">Slogan (frase de destaque no topo da página)</span><input className={input} placeholder="Precisão em cada detalhe." value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} /></label><label><span className="text-xs uppercase tracking-widest text-muted-foreground">Texto da seção “A experiência”</span><textarea rows={2} className={input} placeholder="Mais que um corte: ambiente reservado, bebida e cuidado do início ao fim." value={form.sobre_experiencia} onChange={(e) => setForm({ ...form, sobre_experiencia: e.target.value })} /></label><label><span className="text-xs uppercase tracking-widest text-muted-foreground">Descrição / sobre a barbearia</span><textarea rows={3} className={input} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></label><label><span className="text-xs uppercase tracking-widest text-muted-foreground">Mensagem inicial do botão WhatsApp</span><textarea rows={2} className={input} placeholder="Olá! Gostaria de saber mais sobre os serviços." value={form.mensagem_whatsapp} onChange={(e) => setForm({ ...form, mensagem_whatsapp: e.target.value })} /></label></div></section>

        <section>
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">Identidade visual</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Logo</span>
              <p className="mt-1 text-sm text-muted-foreground">Recomendado: imagem quadrada 320 × 320 px.</p>
              <div className="mt-4 flex flex-col items-start gap-4">
                <div className="relative">
                  {logoPreview ? <img src={logoPreview} alt="Logo atual" className="h-24 w-24 rounded-full border border-primary/30 bg-background object-cover shadow-sm" /> : <div className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-background text-xs text-muted-foreground">Sem logo</div>}
                  {logoPreview && <button type="button" aria-label="Remover logo" title="Remover logo" onClick={() => removerImagem("logo")} className="absolute -right-2 -top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-destructive text-destructive-foreground shadow-md transition hover:scale-105"><X className="h-4 w-4" aria-hidden="true" /></button>}
                </div>
                <input ref={logoInputRef} id="logo-upload" type="file" accept="image/png,image/jpeg,image/webp,image/*" disabled={enviando === "logo"} onChange={(e) => void enviarImagem("logo", e.target.files?.[0])} className="sr-only" />
                <button type="button" disabled={enviando === "logo"} onClick={() => logoInputRef.current?.click()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-primary bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground shadow-sm transition hover:bg-transparent hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"><Upload className="h-4 w-4" aria-hidden="true" />{enviando === "logo" ? "ENVIANDO..." : logoPreview ? "TROCAR LOGO" : "ESCOLHER LOGO"}</button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Imagem de capa</span>
              <p className="mt-1 text-sm text-muted-foreground">Imagem principal exibida no topo do Meu Link.</p>
              <div className="mt-4 space-y-4">
                <div className="relative">
                  {coverPreview ? <img src={coverPreview} alt="Capa atual" className="h-24 w-full rounded-md border border-border object-cover" /> : <div className="flex h-24 w-full items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">Sem imagem de capa</div>}
                  {coverPreview && <button type="button" aria-label="Remover capa" title="Remover capa" onClick={() => removerImagem("capa")} className="absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-destructive text-destructive-foreground shadow-lg transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-destructive"><X className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" /></button>}
                </div>
                <input ref={coverInputRef} id="cover-upload" type="file" accept="image/png,image/jpeg,image/webp,image/*" disabled={enviando === "capa"} onChange={(e) => void enviarImagem("capa", e.target.files?.[0])} className="sr-only" />
                <button type="button" disabled={enviando === "capa"} onClick={() => coverInputRef.current?.click()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-foreground transition hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"><Upload className="h-4 w-4" aria-hidden="true" />{enviando === "capa" ? "ENVIANDO..." : coverPreview ? "TROCAR CAPA" : "ESCOLHER IMAGEM"}</button>
              </div>
            </div>
          </div>
        </section>

        <button className={btn} disabled={salvar.isPending || Boolean(enviando)}>{salvar.isPending ? "SALVANDO..." : "SALVAR CONFIGURAÇÕES"}</button>
      </form>
    </AdminShell>
  );
}