import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Save, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, btn, input } from "@/components/admin/AdminShell";
import { montarMensagemSuporte, SUPORTE_MENSAGEM_PADRAO, useIsSuperAdmin, useSupportMessageTemplate } from "@/lib/license";

export const Route = createFileRoute("/_authenticated/admin/geral")({
  head: () => ({ meta: [{ title: "Admin Geral | BarberFlow" }, { name: "description", content: "Configurações gerais da plataforma." }, { name: "robots", content: "noindex" }] }),
  component: AdminGeral,
});

function normalizarWhatsapp(value: string) { return value.replace(/\D/g, "").slice(0, 15); }
function formatarWhatsapp(value: string) {
  const digits = normalizarWhatsapp(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 11) return `+${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return `+${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7, 11)} ${digits.slice(11)}`;
}

function AdminGeral() {
  const { data: isSuperAdmin, isLoading: checkingRole } = useIsSuperAdmin();
  const { data: savedTemplate } = useSupportMessageTemplate();
  const [whatsapp, setWhatsapp] = useState("");
  const [mensagem, setMensagem] = useState(SUPORTE_MENSAGEM_PADRAO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void (async () => {
      const { data, error } = await (supabase as any).from("platform_settings").select("support_whatsapp, support_message_template").eq("id", "default").maybeSingle();
      if (error) toast.error(error.message);
      setWhatsapp(data?.support_whatsapp ?? "");
      setMensagem(data?.support_message_template || savedTemplate || SUPORTE_MENSAGEM_PADRAO);
      setLoading(false);
    })();
  }, [isSuperAdmin, savedTemplate]);

  async function salvar() {
    const digits = normalizarWhatsapp(whatsapp);
    if (!digits || digits.length < 10) { toast.error("Informe um WhatsApp válido com DDD e código do país."); return; }
    const texto = mensagem.trim();
    if (!texto) { toast.error("Informe a mensagem que será aberta no WhatsApp."); return; }
    if (texto.length > 1024) { toast.error("A mensagem deve ter no máximo 1024 caracteres."); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("platform_settings").update({ support_whatsapp: digits, support_message_template: texto, updated_at: new Date().toISOString() }).eq("id", "default");
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setWhatsapp(digits);
    setMensagem(texto);
    toast.success("WhatsApp e mensagem da equipe salvos com sucesso.");
  }

  const preview = montarMensagemSuporte(mensagem, { id: "lucas-rodrigues10", barbearia: "Barbearia Exemplo", nome: "João", telefone: "82999999999" });

  return (
    <AdminShell title="Admin Geral" subtitle="Configurações gerais da plataforma">
      {checkingRole ? <p className="text-sm text-muted-foreground">Verificando permissões...</p> : !isSuperAdmin ? (
        <div className="max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-6"><h2 className="text-xl">Acesso restrito</h2><p className="mt-2 text-sm text-muted-foreground">Somente o Super Admin pode alterar as configurações gerais da plataforma.</p></div>
      ) : (
        <div className="max-w-3xl space-y-6">
          <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3 text-primary"><MessageCircle className="h-6 w-6" /></div>
              <div><p className="text-xs uppercase tracking-[0.2em] text-primary">Suporte da plataforma</p><h2 className="mt-1 text-2xl">WhatsApp da equipe</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Defina o número central e a mensagem que será aberta quando uma barbearia clicar em “Falar com a equipe”.</p></div>
            </div>

            <label className="mt-8 block"><span className="text-xs uppercase tracking-widest text-muted-foreground">Número do WhatsApp da equipe</span><input className={`${input} mt-2 text-lg`} value={formatarWhatsapp(whatsapp)} onChange={(e) => setWhatsapp(normalizarWhatsapp(e.target.value))} placeholder="+55 82 99999-9999" inputMode="tel" disabled={loading || saving} /><span className="mt-2 block text-xs text-muted-foreground">Use código do país + DDD + número. Ex.: +55 82 99999-9999.</span></label>

            <label className="mt-7 block"><span className="text-xs uppercase tracking-widest text-muted-foreground">Mensagem automática</span><textarea className={`${input} mt-2 min-h-32 resize-y`} value={mensagem} onChange={(e) => setMensagem(e.target.value)} maxLength={1024} disabled={loading || saving} placeholder="Olá, sou /{id}, e tenho uma dúvida." /><div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>Você pode personalizar o texto e usar os campos abaixo.</span><span>{mensagem.length}/1024</span></div></label>

            <div className="mt-5 rounded-lg border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-widest text-primary">Campos disponíveis</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                <code className="rounded bg-secondary px-2 py-1">{'{id}'}</code><span className="text-muted-foreground">ID/slug da barbearia</span>
                <code className="rounded bg-secondary px-2 py-1">{'{barbearia}'}</code><span className="text-muted-foreground">Nome da barbearia</span>
                <code className="rounded bg-secondary px-2 py-1">{'{nome}'}</code><span className="text-muted-foreground">Nome disponível do contato</span>
                <code className="rounded bg-secondary px-2 py-1">{'{telefone}'}</code><span className="text-muted-foreground">Telefone disponível do contato</span>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-background p-4"><Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-medium">Prévia da mensagem</p><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{preview}</p></div></div>

            <button type="button" className={`${btn} mt-6 inline-flex items-center gap-2`} onClick={salvar} disabled={loading || saving}><Save className="h-4 w-4" />{saving ? "SALVANDO..." : "SALVAR CONFIGURAÇÃO"}</button>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
