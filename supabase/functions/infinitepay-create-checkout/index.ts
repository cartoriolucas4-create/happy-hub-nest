import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const plans = {
  mensal: { amount: 5999, label: "Minha Barbearia - Plano mensal" },
  semestral: { amount: 23994, label: "Minha Barbearia - Plano semestral" },
  anual: { amount: 29999, label: "Minha Barbearia - Plano anual" },
} as const;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let order = "";
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) throw new Error("Supabase server credentials unavailable");

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const plan = String(body?.plan ?? "") as keyof typeof plans;
    if (!Object.prototype.hasOwnProperty.call(plans, plan)) return json({ error: "invalid_plan" }, 400);

    const admin = createClient(url, service);
    const { data: shop, error: shopError } = await admin.from("barbershops").select("id").eq("owner_id", user.id).maybeSingle();
    if (shopError) throw shopError;
    if (!shop) return json({ error: "barbershop_not_found" }, 404);

    const selected = plans[plan];
    order = "MB" + crypto.randomUUID().replaceAll("-", "").toUpperCase();
    const { error: insertError } = await admin.from("subscription_orders").insert({
      order_nsu: order, user_id: user.id, barbershop_id: shop.id, plan, amount_cents: selected.amount,
    });
    if (insertError) throw insertError;

    const webhookUrl = "https://gozynjftplaquakpeprx.supabase.co/functions/v1/infinitepay-webhook";
    const redirectUrl = "https://agendocorte.com/admin/assinatura?assinatura=retorno&order_nsu=" + encodeURIComponent(order);
    // Use the merchant's globally enabled checkout settings.
    // Basic link creation requires only the InfiniteTag and items.
    const payload = {
      handle: "minhabarbeariapro",
      order_nsu: order,
      redirect_url: redirectUrl,
      webhook_url: webhookUrl,
      items: [{ quantity: 1, price: selected.amount, description: selected.label }],
    };

    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
    });
    const responseText = await response.text();
    let data: Record<string, unknown>;
    try { data = JSON.parse(responseText); }
    catch { throw new Error("InfinitePay retornou resposta não JSON (HTTP " + response.status + ")"); }

    console.log("InfinitePay link creation", {
      order_nsu: order,
      plan,
      amount_cents: selected.amount,
      http_status: response.status,
      response_keys: Object.keys(data),
      response: response.ok ? data : undefined,
      error: response.ok ? undefined : data,
    });

    if (!response.ok) throw new Error("InfinitePay HTTP " + response.status + ": " + JSON.stringify(data));
    const checkoutUrl = data.url ?? data.checkout_url ?? data.link ?? data.payment_url;
    if (typeof checkoutUrl !== "string" || !checkoutUrl.startsWith("https://checkout.infinitepay.")) {
      throw new Error("InfinitePay não retornou uma URL de checkout válida");
    }

    const { error: updateError } = await admin.from("subscription_orders")
      .update({ checkout_url: checkoutUrl, provider_payload: data })
      .eq("order_nsu", order);
    if (updateError) throw updateError;

    return json({ checkout_url: checkoutUrl, order_nsu: order });
  } catch (error) {
    console.error("InfinitePay checkout error", { order_nsu: order || null, message: error instanceof Error ? error.message : String(error) });
    return json({ error: "checkout_unavailable", details: error instanceof Error ? error.message : String(error) }, 500);
  }
});