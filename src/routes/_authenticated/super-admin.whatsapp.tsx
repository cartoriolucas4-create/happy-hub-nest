import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Save, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SuperShell, sBtn, sInput } from "@/components/superadmin/SuperShell";
import { montarMensagemSuporte, SUPORTE_MENSAGEM_PADRAO, useIsSuperAdmin } from "@/lib/license";

export const Route = createFileRoute("/_authenticated/super-admin/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp da equipe | Super Admin" }, { name: "description", content: "Configuração do WhatsApp e mensagem de atendimento da plataforma." }, { name: "robots", content: "noindex" }] }),
  component: WhatsAppEquipe,
});

function normalizarWhatsapp(value: string) { return value.replace(/\D/g, "").slice(0, 15); }
function formatarWhatsapp(value: string) {
  const digits = normalizarWhatsapp(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 11) return `+${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return `+${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7, 11)} ${digits.slice(11)}`;
}

const CAMPOS = [
  ["{id}", "ID interno da barbearia"],
  ["{slug}", "Slug/link público da barbearia"],
  ["{barbearia}", "Nome da barbearia"],
  ["{nome}", "Nome do responsável"],
  ["{telefone}", "WhatsApp/telefone cadastrado"],
  ["{email}", "E-mail do responsável"],
] as const;

function WhatsAppEquipe() {
  const { data: isSuperAdmin, isLoading: checkingRole } = useIsSuperAdmin();
  const queryClient = useQueryClient();
  const [whatsapp, setWhatsapp] = useState("");
  const [mensagem, setMensagem] = useState(SUPORTE_MENSAGEM_PADRAO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void (async () => {
      const { data, error } = await (supabase as any)
        .from("platform_settings")
        .select("support_whatsapp, support_message_template")
        .eq("id", "default")
        .maybeSingle();
      if (error) toast.error(error.message);
      else {
        setWhatsapp(data?.support_whatsapp ?? "");
        setMensagem(data?.support_message_template || SUPORTE_MENSAGEM_PADRAO);
      }
      setLoading(false);
    })();
  }, [isSuperAdmin]);

  async function salvar() {
    const digits = normalizarWhatsapp(whatsapp);
    const texto = mensagem.trim();
    if (!digits || digits.length < 10) return void toast.error("Informe um WhatsApp válido com DDD e código do país.");
    if (!texto) return void toast.error("Informe a mensagem automática.");
    if (texto.length > 1024) return void toast.error("A mensagem deve ter no máximo 1024 caracteres.");
    setSaving(true);
    const { error } = await (supabase as any).from("platform_settings").update({ support_whatsapp: digits, support_message_template: texto, updated_at: new Date().toISOString() }).eq("id", "default");
    setSaving(false);
    if (error) return void toast.error(error.message);
    setWhatsapp(digits);
    setMensagem(texto);
    await queryClient.invalidateQueries({ queryKey: ["platform-support-whatsapp"] });
    await queryClient.invalidateQueries({ queryKey: ["platform-support-message-template"] });
    toast.success("WhatsApp e mensagem da equipe salvos com sucesso.");
  }

  function inserirCampo(campo: string) { setMensagem((atual) => `${atual}${atual && !/\s$/.test(atual) ? " " : ""}${campo}`); }

  const preview = montarMensagemSuporte(mensagem, { id: "9c3e7a11-EXEMPLO", slug: "lucas-rodrigues10", barbearia: "Barbearia Exemplo", nome: "Lucas Rodrigues", telefone: "5582999999999", email: "lucas@exemplo.com" });

  const content = checkingRole ? <p className="text-sm text-muted-foreground">Verificando permissões...</p> : !isSuperAdmin ? (
    <div className="mx-auto max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-6"><h2 className="text-xl">Acesso restrito</h2><p className="mt-2 text-sm text-muted-foreground">Somente o Super Admin pode alterar as configurações gerais da plataforma.</p></div>
  ) : (
    <div className="max-w-4xl space-y-6">
      <section className="rounded-xl border border-slate-700 bg-[#101923] p-6 sm:p-8">
        <div className="flex items-start gap-4"><div className="rounded-lg bg-primary/10 p-3 text-primary"><MessageCircle className="h-6 w-6" /></div><div><p className="text-xs uppercase tracking-[0.2em] text-sky-300">Suporte da plataforma</p><h2 className="mt-1 text-2xl">WhatsApp da equipe</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">Defina o número central e a mensagem que será aberta automaticamente no WhatsApp quando uma barbearia falar com a equipe.</p></div></div>
        <label className="mt-8 block"><span className="text-xs uppercase tracking-widest text-slate-400">Número do WhatsApp da equipe</span><input className={`${sInput} mt-2 text-lg`} value={formatarWhatsapp(whatsapp)} onChange={(e) => setWhatsapp(normalizarWhatsapp(e.target.value))} placeholder="+55 82 99999-9999" inputMode="tel" disabled={loading || saving} /><span className="mt-2 block text-xs text-slate-400">Use código do país + DDD + número. Ex.: +55 82 99999-9999.</span></label>
        <div className="mt-8 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Mensagem automática</p><h3 className="mt-1 text-xl font-medium text-slate-100">Personalize o texto enviado pelo WhatsApp</h3><p className="mt-1 text-sm text-slate-400">Esta é a mensagem que o barbeiro verá pronta ao clicar em “FALAR COM A EQUIPE”.</p></div><span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">{mensagem.length}/1024</span></div>
          <textarea aria-label="Mensagem automática do WhatsApp" className={`${sInput} mt-4 min-h-44 resize-y text-base leading-relaxed`} value={mensagem} onChange={(e) => setMensagem(e.target.value)} maxLength={1024} disabled={loading || saving} placeholder="Olá, sou da barbearia {barbearia}. Meu ID é {id}. Preciso de ajuda." />
          <p className="mt-2 text-xs text-slate-400">Você pode escrever qualquer mensagem. Use os campos automáticos abaixo para incluir os dados reais da barbearia no texto.</p>
        </div>
        <div className="mt-5 rounded-lg border border-slate-700 bg-[#14202b] p-4"><p className="text-xs uppercase tracking-widest text-sky-300">Campos automáticos</p><p className="mt-1 text-xs text-slate-500">Clique em um campo para adicioná-lo ao final da mensagem.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{CAMPOS.map(([campo, descricao]) => <button key={campo} type="button" className="flex items-center justify-between gap-3 rounded-md border border-slate-700 bg-slate-800/70 px-3 py-2 text-left transition hover:border-primary" onClick={() => inserirCampo(campo)} disabled={loading || saving}><code className="text-sm text-sky-300">{campo}</code><span className="text-xs text-slate-400">{descricao}</span></button>)}</div></div>
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-slate-700 bg-[#14202b] p-4"><Shield className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" /><div className="min-w-0"><p className="text-sm font-medium">Prévia da mensagem</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-400">{preview}</p></div></div>
        <button type="button" className={`${sBtn} mt-6 inline-flex items-center gap-2`} onClick={salvar} disabled={loading || saving}><Save className="h-4 w-4" />{saving ? "SALVANDO..." : "SALVAR CONFIGURAÇÃO"}</button>
      </section>
    </div>
  );
  return <SuperShell title="WhatsApp da equipe" subtitle="Configuração do atendimento da plataforma">{content}</SuperShell>;
}
