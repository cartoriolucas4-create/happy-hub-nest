import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/admin/assinatura")({
  head: () => ({ meta: [{ title: "Assinatura | Minha Barbearia" }, { name: "robots", content: "noindex" }] }),
  component: AssinaturaPage,
});

const PLANS = {
  mensal: { label: "Mensal", price: "R$ 59,99", detail: "30 dias de acesso" },
  semestral: { label: "Semestral", price: "R$ 239,94", detail: "6 meses de acesso" },
  anual: { label: "Anual", price: "R$ 299,99", detail: "12 meses de acesso" },
  teste_admin_30d: { label: "Teste administrativo", price: "R$ 1,00", detail: "30 dias adicionais após os 10 dias de teste restantes" },
} as const;
type Plan = keyof typeof PLANS;

function AssinaturaPage() {
  const { data: shopData, isLoading: shopLoading, error: shopError } = useShop();
  const shop = shopData as any;
  const [plan, setPlan] = useState<Plan>("anual");
  const [canUseTestPlan, setCanUseTestPlan] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [paid, setPaid] = useState(false);
  const [orderNsu, setOrderNsu] = useState("");

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const allowed = String(data.user?.email ?? "").trim().toLowerCase() === "cartoriolucas4@gmail.com";
      setCanUseTestPlan(allowed);
      if (allowed) setPlan("teste_admin_30d");
      setAuthChecked(true);
    }).catch(() => { if (active) setAuthChecked(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("plano");
    if (requested && requested in PLANS && requested !== "teste_admin_30d") setPlan(requested as Plan);
    const order = params.get("order_nsu");
    if (order) setOrderNsu(order);
    if (params.get("assinatura") === "retorno") setMessage("Estamos confirmando seu pagamento com a InfinitePay. Esta página será atualizada automaticamente.");
  }, []);

  useEffect(() => {
    if (!orderNsu) return;
    let active = true;
    const check = async () => {
      const { data, error } = await (supabase as any).from("subscription_orders").select("status, plan").eq("order_nsu", orderNsu).maybeSingle();
      if (!active) return;
      if (error) { setMessage("Pagamento recebido? Ainda estamos aguardando a confirmação segura do provedor."); return; }
      if (data?.status === "paid") { setPaid(true); setMessage("Pagamento confirmado! Sua licença já foi atualizada."); }
      else if (data?.status === "held") setMessage("Pagamento confirmado, mas sua licença precisa de análise administrativa.");
      else if (data?.status === "pending") setMessage("Pagamento ainda não confirmado. Aguarde alguns instantes.");
    };
    void check();
    const timer = window.setInterval(() => void check(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [orderNsu]);

  const selected = useMemo(() => PLANS[plan], [plan]);
  const visiblePlans = (Object.keys(PLANS) as Plan[]).filter((key) => key !== "teste_admin_30d" || (authChecked && canUseTestPlan));

  async function iniciarPagamento() {
    if (loading) return;
    setLoading(true); setMessage("");
    // Open the tab synchronously during the click. Opening it after await is blocked by browsers.
    const checkoutWindow = window.open("about:blank", "_blank");
    if (!checkoutWindow) {
      setMessage("O navegador bloqueou a nova aba. Permita pop-ups para este site e tente novamente.");
      setLoading(false);
      return;
    }
    checkoutWindow.opener = null;
    try {
      const { data, error } = await supabase.functions.invoke("infinitepay-create-checkout", { body: { plan } });
      if (error) throw error;
      const url = data?.checkout_url;
      if (typeof url !== "string" || !url.startsWith("https://")) throw new Error(data?.error || "Não foi possível gerar o checkout.");
      checkoutWindow.location.replace(url);
      setLoading(false);
    } catch (error) {
      console.error("[Assinatura] Falha ao criar checkout:", error);
      checkoutWindow.close();
      const detail = error instanceof Error ? error.message : String(error);
      setMessage("A InfinitePay não conseguiu gerar o checkout. " + detail);
      setLoading(false);
    }
  }

  return <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
    <div className="mx-auto max-w-3xl">
      <Link to="/admin" className="text-sm text-muted-foreground underline underline-offset-4">Voltar ao painel</Link>
      <div className="mt-8 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><CreditCard className="h-5 w-5"/></span><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Minha Barbearia</p><h1 className="text-3xl font-semibold">Escolha sua assinatura</h1></div></div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Selecione o plano. O checkout seguro da InfinitePay será aberto em uma nova aba; esta página permanecerá aberta para você continuar usando o sistema.</p>
      {new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("trial") === "expirado" && <div role="alert" className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5"><p className="font-semibold text-amber-500">Seu período de teste gratuito terminou.</p><p className="mt-1 text-sm text-muted-foreground">Para continuar usando sua barbearia, escolha um plano e realize o pagamento. Após a confirmação, seu acesso será liberado automaticamente.</p></div>}
      {shopLoading ? <p className="mt-8 text-sm text-muted-foreground">Carregando sua barbearia...</p> : shopError || !shop ? <div className="mt-8 rounded-xl border border-destructive/30 p-5 text-sm">Não foi possível localizar sua barbearia. Acesse a configuração inicial e tente novamente.</div> :
      <><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{visiblePlans.map(key => <button key={key} type="button" onClick={() => setPlan(key)} className={`rounded-xl border p-5 text-left transition ${plan===key?"border-primary bg-primary/5 ring-2 ring-primary/20":"border-border bg-card hover:border-primary/50"}`} aria-pressed={plan===key}><span className="text-sm font-semibold">{PLANS[key].label}</span><strong className="mt-3 block text-2xl">{PLANS[key].price}</strong><span className="mt-1 block text-xs text-muted-foreground">{PLANS[key].detail}</span>{plan===key && <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary"><CheckCircle2 className="h-4 w-4"/> Selecionado</span>}</button>)}</div>
      {authChecked && canUseTestPlan && <div className="mt-5 rounded-xl border-2 border-amber-500/60 bg-amber-500/10 p-4 text-sm"><strong className="text-amber-500">PLANO DE TESTE ADMINISTRATIVO — R$ 1,00</strong><p className="mt-1 text-muted-foreground">Sua conta está configurada com 10 dias restantes de avaliação. Se o pagamento de R$ 1,00 for confirmado pela InfinitePay, serão acrescentados 30 dias após o fim desse período, totalizando cerca de 40 dias a partir de hoje.</p></div>}<div className="mt-6 rounded-xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Plano selecionado</p><p className="mt-1 text-lg font-semibold">{selected.label}</p><p className="text-xs text-muted-foreground">{selected.detail}</p></div><strong className="text-2xl">{selected.price}</strong></div><button type="button" onClick={iniciarPagamento} disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{loading ? <><Loader2 className="h-4 w-4 animate-spin"/> GERANDO CHECKOUT...</> : <>PAGAR COM INFINITEPAY <CreditCard className="h-4 w-4"/></>}</button><div className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary"/> A liberação depende da confirmação do pagamento pelo servidor. O redirecionamento de retorno não libera acesso por si só.</div></div></>}
      {message && <div className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-card p-4 text-sm"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary"/><span>{message}</span></div>}
      {paid && <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-500">Sua assinatura está ativa. <Link to="/admin" className="underline">Ir para o painel</Link></div>}
      <p className="mt-8 text-center text-xs text-muted-foreground">A InfinitePay não realiza renovação recorrente automática nesta integração. Para renovar, será necessário efetuar um novo pagamento antes do vencimento.</p>
    </div>
  </main>;
}
