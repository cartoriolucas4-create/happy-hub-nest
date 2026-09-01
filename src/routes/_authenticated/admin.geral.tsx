import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Save, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, btn, input } from "@/components/admin/AdminShell";
import { useIsSuperAdmin } from "@/lib/license";

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
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void (async () => {
      const { data, error } = await supabase.from("platform_settings").select("support_whatsapp").eq("id", "default").maybeSingle();
      if (error) toast.error(error.message);
      setWhatsapp(data?.support_whatsapp ?? "");
      setLoading(false);
    })();
  }, [isSuperAdmin]);

  async function salvar() {
    const digits = normalizarWhatsapp(whatsapp);
    if (digits && digits.length < 10) { toast.error("Informe um WhatsApp válido com DDD e código do país."); return; }
    setSaving(true);
    const { error } = await supabase.from("platform_settings").update({ support_whatsapp: digits || null, updated_at: new Date().toISOString() }).eq("id", "default");
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setWhatsapp(digits);
    toast.success("WhatsApp da equipe salvo com sucesso.");
  }

  return (
    <AdminShell title="Admin Geral" subtitle="Configurações gerais da plataforma">
      {checkingRole ? <p className="text-sm text-muted-foreground">Verificando permissões...</p> : !isSuperAdmin ? (
        <div className="max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-6"><h2 className="text-xl">Acesso restrito</h2><p className="mt-2 text-sm text-muted-foreground">Somente o Super Admin pode alterar as configurações gerais da plataforma.</p></div>
      ) : (
        <div className="max-w-2xl space-y-6">
          <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3 text-primary"><MessageCircle className="h-6 w-6" /></div>
              <div><p className="text-xs uppercase tracking-[0.2em] text-primary">Suporte</p><h2 className="mt-1 text-2xl">WhatsApp da equipe</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Número central usado pelo botão “Falar com a equipe” no Dashboard de todas as barbearias.</p></div>
            </div>
            <label className="mt-8 block"><span className="text-xs uppercase tracking-widest text-muted-foreground">Número do WhatsApp</span><input className={`${input} mt-2 text-lg`} value={formatarWhatsapp(whatsapp)} onChange={(e) => setWhatsapp(normalizarWhatsapp(e.target.value))} placeholder="+55 82 99999-9999" inputMode="tel" disabled={loading || saving} /><span className="mt-2 block text-xs text-muted-foreground">Use código do país + DDD + número. Ex.: +55 82 99999-9999.</span></label>
            <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-background p-4"><Shield className="h-5 w-5 text-primary" /><div><p className="text-sm font-medium">Mensagem automática</p><p className="text-xs text-muted-foreground">Olá, sou /ID-DO-SITE, e tenho uma dúvida.</p></div></div>
            <button type="button" className={`${btn} mt-6 inline-flex items-center gap-2`} onClick={salvar} disabled={loading || saving}><Save className="h-4 w-4" />{saving ? "SALVANDO..." : "SALVAR WHATSAPP"}</button>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
