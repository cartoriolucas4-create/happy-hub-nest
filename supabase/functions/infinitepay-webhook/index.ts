import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="GET")return json({ok:true,service:"infinitepay-webhook",project:"gozynjftplaquakpeprx"});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 try{
  const payload=await req.json(),order=String(payload.order_nsu??"").trim(),transaction=String(payload.transaction_nsu??"").trim(),slug=String(payload.invoice_slug??payload.slug??"").trim();
  if(!order||!transaction||!slug)return json({error:"invalid_payment_notice"},400);
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!key)throw new Error("Supabase server credentials unavailable");
  const admin=createClient(url,key),{data:pending,error:lookupError}=await admin.from("subscription_orders").select("order_nsu,amount_cents,status").eq("order_nsu",order).maybeSingle();
  if(lookupError)throw lookupError;if(!pending)return json({error:"order_not_found"},404);
  if(pending.status==="paid"||pending.status==="held")return json({ok:true,duplicate:true});
  const response=await fetch("https://api.checkout.infinitepay.io/payment_check",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({handle:"minhabeariapro",order_nsu:order,transaction_nsu:transaction,slug})});
  const check=await response.json();
  if(!response.ok||check.success!==true||check.paid!==true||Number(check.amount)!==pending.amount_cents)return json({error:"payment_not_verified"},400);
  const {data:result,error}=await admin.rpc("confirm_infinitepay_subscription",{p_order_nsu:order,p_invoice_slug:slug,p_transaction_nsu:transaction,p_receipt_url:payload.receipt_url??null,p_payload:payload});
  if(error)throw error;if(!result?.ok)return json(result,400);return json({ok:true,status:result.status??"paid"});
 }catch(e){console.error("InfinitePay webhook error",e);return json({error:"webhook_processing_error"},500);}
});