import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SuperShell, sBtn, sInput } from "@/components/superadmin/SuperShell";
import { useIsSuperAdmin } from "@/lib/license";

export const Route = createFileRoute("/_authenticated/super-admin/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp da equipe | Super Admin" }, { name: "description", content: "Configuração do WhatsApp da equipe da plataforma." }, { name: "robots", content: "noindex" }] }),
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

function WhatsAppEquipe() {
  const { data: isSuperAdmin, isLoading: checkingRole } = useIsSuperAdmin();
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void (async () => {
      const { data, error } = await (supabase as any)
        .from("platform_settings")
        .select("support_whatsapp")
        .eq("id", "default")
        .maybeSingle();
      if (error) {
        toast.error(error.message);
      } else {
        setWhatsapp(data?.support_whatsapp ?? "");
      }
      setLoading(false);
    })();
  }, [isSuperAdmin]);

  async function salvar() {
    const digits = normalizarWhatsapp(whatsapp);
    if (!digits || digits.length < 10) {
      toast.error("Informe um WhatsApp válido com DDD e código do país.");
      return;
    }

    setSaving(true);
    const { error } = await (supabase as any)
      .from("platform_settings")
      .update({ support_whatsapp: digits, updated_at: new Date().toISOString() })
      .eq("id", "default");
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setWhatsapp(digits);
    toast.success("WhatsApp da equipe salvo com sucesso.");
  }

  const content = checkingRole ? (
    <p className="text-sm text-muted-foreground">Verificando permissões...</p>
  ) : !isSuperAdmin ? (
    <div className="mx-auto max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <h2 className="text-xl">Acesso restrito</h2>
      <p className="mt-2 text-sm text-muted-foreground">Somente o Super Admin pode alterar as configurações gerais da plataforma.</p>
    </div>
  ) : (
    <div className="max-w-3xl">
      <section className="rounded-xl border border-slate-700 bg-[#101923] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3 text-primary"><MessageCircle className="h-6 w-6" /></div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Suporte da plataforma</p>
            <h2 className="mt-1 text-2xl">WhatsApp da equipe</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">Defina o número central que será usado para contato com a equipe da plataforma.</p>
          </div>
        </div>

        <label className="mt-8 block">
          <span className="text-xs uppercase tracking-widest text-slate-400">Número do WhatsApp da equipe</span>
          <input
            className={`${sInput} mt-2 text-lg`}
            value={formatarWhatsapp(whatsapp)}
            onChange={(e) => setWhatsapp(normalizarWhatsapp(e.target.value))}
            placeholder="+55 82 99999-9999"
            inputMode="tel"
            disabled={loading || saving}
          />
          <span className="mt-2 block text-xs text-slate-400">Use código do país + DDD + número. Ex.: +55 82 99999-9999.</span>
        </label>

        <button type="button" className={`${sBtn} mt-6 inline-flex items-center gap-2`} onClick={salvar} disabled={loading || saving}>
          <Save className="h-4 w-4" />
          {saving ? "SALVANDO..." : "SALVAR WHATSAPP"}
        </button>
      </section>
    </div>
  );

  return <SuperShell title="WhatsApp da equipe" subtitle="Configuração do atendimento da plataforma">{content}</SuperShell>;
}
