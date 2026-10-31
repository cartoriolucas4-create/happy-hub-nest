import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/comprar")({
  head: () => ({ meta: [{ title: "Escolha seu plano | Minha Barbearia" }, { name: "robots", content: "noindex" }] }),
  component: ComprarPage,
});

const PLANS = {
  mensal: { label: "Mensal", price: "R$ 59,99", detail: "30 dias de acesso" },
  semestral: { label: "Semestral", price: "R$ 239,94", detail: "6 meses de acesso" },
  anual: { label: "Anual", price: "R$ 299,99", detail: "12 meses de acesso" },
} as const;
type Plan = keyof typeof PLANS;

function ComprarPage() {
  const [plan, setPlan] = useState<Plan>("anual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("plano");
    if (requested && requested in PLANS) setPlan(requested as Plan);
  }, []);
  async function checkout() {
    if (loading) return;
    setLoading(true); setError("");
    // Open synchronously from the click so Chrome does not block the payment tab.
    const checkoutWindow = window.open("about:blank", "_blank");
    if (!checkoutWindow) {
      setError("O navegador bloqueou a nova aba. Permita pop-ups para este site e tente novamente.");
      setLoading(false);
      return;
    }
    checkoutWindow.opener = null;
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("infinitepay-public-checkout", { body: { plan } });
      if (invokeError) throw invokeError;
      if (typeof data?.checkout_url !== "string" || !data.checkout_url.startsWith("https://")) {
        throw new Error(data?.details || data?.error || "Não foi possível gerar o pagamento.");
      }
      checkoutWindow.location.replace(data.checkout_url);
      setLoading(false);
    } catch (e) {
      console.error("[Compra pública] erro ao iniciar checkout", e);
      checkoutWindow.close();
      const detail = e instanceof Error ? e.message : String(e);
      setError("A InfinitePay não conseguiu gerar o checkout. " + detail);
      setLoading(false);
    }
  }
  return <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4"/> Voltar ao site</Link>
      <div className="mt-8 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><CreditCard className="h-5 w-5"/></span><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Minha Barbearia</p><h1 className="text-3xl font-semibold">Escolha sua assinatura</h1></div></div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Pague com segurança pela InfinitePay. Não precisa criar uma conta antes do pagamento: após a confirmação, você será direcionado para fazer seu cadastro.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">{(Object.keys(PLANS) as Plan[]).map(key => <button key={key} type="button" onClick={() => setPlan(key)} className={`rounded-xl border p-5 text-left transition ${plan===key?"border-primary bg-primary/5 ring-2 ring-primary/20":"border-border bg-card hover:border-primary/50"}`} aria-pressed={plan===key}><span className="text-sm font-semibold">{PLANS[key].label}</span><strong className="mt-3 block text-2xl">{PLANS[key].price}</strong><span className="mt-1 block text-xs text-muted-foreground">{PLANS[key].detail}</span>{plan===key && <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary"><CheckCircle2 className="h-4 w-4"/> Selecionado</span>}</button>)}</div>
      <section className="mt-6 rounded-xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Plano selecionado</p><p className="mt-1 text-lg font-semibold">{PLANS[plan].label}</p><p className="text-xs text-muted-foreground">{PLANS[plan].detail}</p></div><strong className="text-2xl">{PLANS[plan].price}</strong></div><button type="button" onClick={checkout} disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{loading ? <><Loader2 className="h-4 w-4 animate-spin"/> GERANDO PAGAMENTO...</> : <>PAGAR COM INFINITEPAY <CreditCard className="h-4 w-4"/></>}</button><div className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary"/> Sua assinatura só será liberada depois da confirmação do pagamento e da conclusão do cadastro.</div>{error && <p role="alert" className="mt-4 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}</section>
      <p className="mt-8 text-center text-xs text-muted-foreground">A InfinitePay não realiza renovação recorrente automática nesta integração. Para renovar, será necessário efetuar um novo pagamento antes do vencimento.</p>
    </div>
  </main>;
}
