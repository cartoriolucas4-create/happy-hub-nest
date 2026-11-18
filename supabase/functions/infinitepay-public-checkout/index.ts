import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const plans = {
  mensal: { amount: 5999, label: "Minha Barbearia - Plano mensal" },
  semestral: { amount: 23994, label: "Minha Barbearia - Plano semestral" },
  anual: { amount: 29999, label: "Minha Barbearia - Plano anual" },
} as const;

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  let orderNsu: string | null = null;
  let admin: ReturnType<typeof createClient> | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase server credentials are unavailable");
    }

    const body = await request.json();
    const plan = typeof body?.plan === "string" ? body.plan : "";

    if (!Object.prototype.hasOwnProperty.call(plans, plan)) {
      return jsonResponse({ error: "invalid_plan" }, 400);
    }

    admin = createClient(supabaseUrl, serviceRoleKey);
    const selected = plans[plan as keyof typeof plans];
    orderNsu = "MBP" + crypto.randomUUID().replaceAll("-", "").toUpperCase();

    const { error: insertError } = await admin
      .from("public_subscription_checkouts")
      .insert({
        order_nsu: orderNsu,
        plan,
        amount_cents: selected.amount,
      });

    if (insertError) throw insertError;

    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        handle: "minhabarbeariapro",
        order_nsu: orderNsu,
        redirect_url:
          "https://agendocorte.com/cadastro?compra=" + encodeURIComponent(orderNsu),
        webhook_url:
          "https://gozynjftplaquakpeprx.supabase.co/functions/v1/infinitepay-webhook",
        items: [
          {
            quantity: 1,
            price: selected.amount,
            description: selected.label,
          },
        ],
      }),
    });

    const responseText = await response.text();
    let providerData: Record<string, unknown>;

    try {
      providerData = JSON.parse(responseText);
    } catch {
      throw new Error(
        "InfinitePay returned a non-JSON response (HTTP " + response.status + ")",
      );
    }

    if (!response.ok) {
      throw new Error(
        "InfinitePay HTTP " + response.status + ": " + JSON.stringify(providerData),
      );
    }

    const checkoutUrl =
      providerData.url ??
      providerData.checkout_url ??
      providerData.link ??
      providerData.payment_url;

    if (
      typeof checkoutUrl !== "string" ||
      !checkoutUrl.startsWith("https://checkout.infinitepay.")
    ) {
      throw new Error("InfinitePay did not return a valid checkout URL");
    }

    const { error: updateError } = await admin
      .from("public_subscription_checkouts")
      .update({
        checkout_url: checkoutUrl,
        provider_payload: providerData,
        updated_at: new Date().toISOString(),
      })
      .eq("order_nsu", orderNsu);

    if (updateError) throw updateError;

    return jsonResponse({
      checkout_url: checkoutUrl,
      order_nsu: orderNsu,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Public InfinitePay checkout error", {
      order_nsu: orderNsu,
      message,
    });

    if (admin && orderNsu) {
      const { error: expireError } = await admin
        .from("public_subscription_checkouts")
        .update({
          status: "expired",
          provider_payload: { error: message },
          updated_at: new Date().toISOString(),
        })
        .eq("order_nsu", orderNsu);

      if (expireError) {
        console.error("Could not expire failed public checkout order", {
          order_nsu: orderNsu,
          message: expireError.message,
        });
      }
    }

    return jsonResponse({ error: "checkout_unavailable" }, 500);
  }
});
