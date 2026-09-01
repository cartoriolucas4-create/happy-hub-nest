import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/autorizacao")({ component: Autorizacao });

function Autorizacao() {
  const { data: shop } = useShop();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shop) return;
    (async () => {
      const { data } = await (supabase as any).from("public_booking_auth_settings").select("enabled").eq("barbershop_id", shop.id).maybeSingle();
      setEnabled(Boolean(data?.enabled));
      setLoading(false);
    })();
  }, [shop]);

  async function salvar(value: boolean) {
    if (!shop) return;
    setSaving(true);
    const { error } = await (supabase as any).from("public_booking_auth_settings").upsert({ barbershop_id: shop.id, enabled: value });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setEnabled(value);
    toast.success(value ? "Autenticação obrigatória ativada." : "Autenticação obrigatória desativada.");
  }

  return <AdminShell title="Autorização" subtitle="Defina se o cliente precisa se autenticar antes de agendar.">
    <div className="max-w-2xl rounded-xl border border-border bg-card p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-3 text-primary"><ShieldCheck className="h-6 w-6" /></div>
        <div><h2 className="text-xl">Autenticação para agendamentos</h2><p className="mt-1 text-sm text-muted-foreground">Quando ativada, o cliente deverá entrar com Google, Facebook, Apple ou cadastrar nome e telefone com código de verificação.</p></div>
      </div>
      <div className="mt-8 flex items-center justify-between gap-4 rounded-lg border border-border p-4">
        <div><p className="font-medium">Exigir autenticação</p><p className="text-sm text-muted-foreground">{enabled ? "Ativada para este link." : "Desativada. Clientes podem agendar sem login."}</p></div>
        <button type="button" disabled={loading || saving} onClick={() => salvar(!enabled)} aria-pressed={enabled} className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-primary" : "bg-secondary"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${enabled ? "left-6" : "left-1"}`} /></button>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {["Google", "Facebook", "Apple", "Nome + telefone"].map((item) => <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 text-primary" />{item}</div>)}
      </div>
    </div>
  </AdminShell>;
}
