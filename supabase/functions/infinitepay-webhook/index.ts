import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const errorDetails = (error: unknown) => {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    return { name: e.name ?? null, message: e.message ?? null, code: e.code ?? null,
      details: e.details ?? null, hint: e.hint ?? null, status: e.status ?? null };
  }
  return { message: String(error) };
};

Deno.serve(async (req: Request) => {
  if (req.method === "GET") return json({ ok: true, service: "infinitepay-webhook" });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const payload = await req.json();
    const event = String(payload.event ?? payload.status ?? "").toLowerCase();
    const order = String(payload.order_nsu ?? "").trim();
    const transaction = String(payload.transaction_nsu ?? "").trim();
    const slug = String(payload.invoice_slug ?? payload.slug ?? "").trim();

    if (event && !["paid", "settled"].includes(event)) {
      console.log("InfinitePay non-paid webhook acknowledged", { event, order_nsu: order || null });
      return json({ ok: true, ignored: true, event });
    }
    if (!order || !transaction || !slug) {
      console.warn("InfinitePay webhook missing identifiers", {
        event: event || null, has_order: !!order, has_transaction: !!transaction, has_slug: !!slug,
      });
      return json({ error: "invalid_payment_notice" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const infinitePayKey = Deno.env.get("INFINITEPAY_API_KEY");
    if (!url || !key) throw new Error("Supabase server credentials unavailable");
    if (!infinitePayKey) throw new Error("INFINITEPAY_API_KEY secret is not available to this Edge Function");
    const admin = createClient(url, key);

    const { data: publicOrder, error: publicLookupError } = await admin
      .from("public_subscription_checkouts").select("order_nsu,amount_cents,status")
      .eq("order_nsu", order).maybeSingle();
    if (publicLookupError) throw publicLookupError;

    const { data: pending, error: lookupError } = publicOrder
      ? { data: null, error: null }
      : await admin.from("subscription_orders").select("order_nsu,amount_cents,status")
          .eq("order_nsu", order).maybeSingle();
    if (lookupError) throw lookupError;

    const target = publicOrder ?? pending;
    if (!target) {
      console.warn("InfinitePay webhook order not found", { order_nsu: order });
      return json({ error: "order_not_found" }, 404);
    }
    if (["paid", "held", "claimed"].includes(target.status)) {
      return json({ ok: true, duplicate: true, status: target.status });
    }
    if (target.status !== "pending") return json({ error: "invalid_order_state" }, 400);

    const checkResponse = await fetch("https://api.checkout.infinitepay.io/payment_check", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "X-Api-Key": infinitePayKey },
      body: JSON.stringify({ handle: "minhabarbeariapro", order_nsu: order, transaction_nsu: transaction, slug }),
    });
    const checkText = await checkResponse.text();
    let check: Record<string, unknown>;
    try { check = JSON.parse(checkText); }
    catch { throw new Error("payment_check returned non-JSON response (HTTP " + checkResponse.status + ")"); }

    console.log("InfinitePay payment verification", {
      order_nsu: order, http_status: checkResponse.status, success: check.success,
      paid: check.paid, amount: check.amount, paid_amount: check.paid_amount,
      capture_method: check.capture_method,
    });

    if (!checkResponse.ok || check.success !== true || check.paid !== true ||
        Number(check.amount) !== Number(target.amount_cents)) {
      return json({ error: "payment_not_verified" }, 400);
    }

    if (publicOrder) {
      const now = new Date().toISOString();
      const { error: updateError } = await admin.from("public_subscription_checkouts")
        .update({ status: "paid", invoice_slug: slug, transaction_nsu: transaction,
          receipt_url: payload.receipt_url ?? null, provider_payload: payload, paid_at: now, updated_at: now })
        .eq("order_nsu", order).eq("status", "pending");
      if (updateError) throw updateError;
      return json({ ok: true, status: "paid_pending_signup" });
    }

    const { data: result, error: confirmError } = await admin.rpc("confirm_infinitepay_subscription", {
      p_order_nsu: order, p_invoice_slug: slug, p_transaction_nsu: transaction,
      p_receipt_url: payload.receipt_url ?? null, p_payload: payload,
    });
    if (confirmError) {
      console.error("InfinitePay subscription confirmation RPC failed", {
        order_nsu: order, error: errorDetails(confirmError),
      });
      throw confirmError;
    }
    if (!result?.ok) {
      console.error("InfinitePay subscription confirmation rejected", { order_nsu: order, result });
      return json(result, 409);
    }
    return json({ ok: true, status: result.status ?? "paid", duplicate: result.duplicate ?? false });
  } catch (error) {
    console.error("InfinitePay webhook error", errorDetails(error));
    return json({ error: "webhook_processing_error" }, 500);
  }
});