import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 try{
  const payload=await req.json(),event=String(payload.event||payload.status||"").toLowerCase();
  if(!["paid","settled"].includes(event))return json({ok:true,ignored:true});
  const order=String(payload.order_nsu||"").trim(),transaction=String(payload.transaction_nsu||"").trim(),slug=String(payload.invoice_slug||payload.slug||"").trim();
  if(!order||!transaction||!slug)return json({error:"invalid_payload"},400);
  const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data:o,error}=await db.from("subscription_orders").select("*").eq("order_nsu",order).maybeSingle();
  if(error||!o)return json({error:"order_not_found"},404);
  if(["paid","held"].includes(o.status))return json({ok:true,duplicate:true});
  const check=await fetch("https://api.checkout.infinitepay.io/payment_check",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({handle:"minhabeariapro",order_nsu:order,transaction_nsu:transaction,slug})});
  const v=await check.json(),amount=Number(v.amount??v.paid_amount??0);
  if(!check.ok||v.paid!==true||amount!==o.amount_cents||String(v.order_nsu||"")!==order||String(v.transaction_nsu||"")!==transaction||String(v.slug||"")!==slug){console.warn("InfinitePay payment_check mismatch",order,v);return json({error:"payment_not_verified"},409);}
  const {data:result,error:rpcError}=await db.rpc("confirm_infinitepay_subscription",{p_order_nsu:order,p_invoice_slug:slug,p_transaction_nsu:transaction,p_receipt_url:payload.receipt_url||null,p_payload:payload});
  if(rpcError)throw rpcError;return json(result);
 }catch(e){console.error(e);return json({error:"webhook_processing_error"},500);}
});