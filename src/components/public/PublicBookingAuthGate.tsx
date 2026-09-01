import { useEffect, useState } from "react";
import { Apple, Facebook, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function PublicBookingAuthGate({ slug, children }: { slug: string; children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [required, setRequired] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: shop } = await supabase.from("barbershops").select("id").eq("slug", slug).maybeSingle();
      if (!shop) { if (active) setLoading(false); return; }
      const { data: setting } = await supabase.from("public_booking_auth_settings").select("enabled").eq("barbershop_id", shop.id).maybeSingle();
      const { data: session } = await supabase.auth.getSession();
      if (active) { setRequired(Boolean(setting?.enabled)); setAuthenticated(Boolean(session.session)); setLoading(false); }
    })();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setAuthenticated(Boolean(session)));
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [slug]);

  async function oauth(provider: "google" | "facebook" | "apple") {
    setError(""); setBusy(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.href } });
    if (authError) { setError(authError.message); setBusy(false); }
  }

  async function sendCode() {
    if (name.trim().length < 3) { setError("Informe seu nome completo."); return; }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { setError("Informe um telefone válido com DDD."); return; }
    setError(""); setBusy(true);
    const { error: authError } = await supabase.auth.signInWithOtp({ phone: `+55${digits}`, options: { data: { full_name: name.trim() } } });
    setBusy(false);
    if (authError) { setError(authError.message); return; }
    setCodeSent(true);
  }

  async function verifyCode() {
    const digits = phone.replace(/\D/g, "");
    if (!code.trim()) { setError("Informe o código recebido."); return; }
    setError(""); setBusy(true);
    const { error: authError } = await supabase.auth.verifyOtp({ phone: `+55${digits}`, token: code.trim(), type: "sms" });
    setBusy(false);
    if (authError) setError(authError.message);
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!required || authenticated) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-foreground">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Agendamento</p>
        <h1 className="mt-2 text-3xl">Entre para continuar</h1>
        <p className="mt-2 text-sm text-muted-foreground">Esta barbearia exige autenticação para concluir o agendamento.</p>
        <div className="mt-6 grid gap-3">
          <button disabled={busy} onClick={() => oauth("google")} className="flex w-full items-center justify-center gap-3 rounded-md border border-border bg-background px-4 py-3 text-sm font-medium hover:border-primary disabled:opacity-60"><span className="text-lg font-bold">G</span> Continuar com Google</button>
          <button disabled={busy} onClick={() => oauth("facebook")} className="flex w-full items-center justify-center gap-3 rounded-md border border-border bg-background px-4 py-3 text-sm font-medium hover:border-primary disabled:opacity-60"><Facebook className="h-4 w-4" /> Continuar com Facebook</button>
          <button disabled={busy} onClick={() => oauth("apple")} className="flex w-full items-center justify-center gap-3 rounded-md border border-border bg-background px-4 py-3 text-sm font-medium hover:border-primary disabled:opacity-60"><Apple className="h-4 w-4" /> Continuar com Apple</button>
        </div>
        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />OU CADASTRE-SE COM TELEFONE<span className="h-px flex-1 bg-border" /></div>
        <div className="space-y-3">
          <input className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} disabled={codeSent} />
          <input className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" placeholder="Telefone / WhatsApp" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={codeSent} />
          {codeSent && <input className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm tracking-[0.3em] outline-none focus:border-primary" placeholder="Código" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />}
          <button disabled={busy} onClick={codeSent ? verifyCode : sendCode} className="w-full rounded-md bg-primary px-4 py-3 font-display text-sm tracking-widest text-primary-foreground disabled:opacity-60">{busy ? "AGUARDE..." : codeSent ? "CONFIRMAR CÓDIGO" : "CADASTRAR COM TELEFONE"}</button>
        </div>
        {error && <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
