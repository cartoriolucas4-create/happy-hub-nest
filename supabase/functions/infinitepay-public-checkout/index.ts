import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-supabase-api-version","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Max-Age":"86400"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const plans={mensal:{amount:5999,label:"Minha Barbearia - Plano mensal"},semestral:{amount:23994,label:"Minha Barbearia - Plano semestral"},anual:{amount:29999,label:"Minha Barbearia - Plano anual"}} as const;
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 try{
  const body=await req.json(),plan=String(body?.plan??"") as keyof typeof plans;
  if(!Object.prototype.hasOwnProperty.call(plans,plan))return json({error:"invalid_plan"},400);
  const url=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin=createClient(url,key),selected=plans[plan];
  const order="MBP"+crypto.randomUUID().replaceAll("-","").toUpperCase();
  const {error:insertError}=await admin.from("public_subscription_checkouts").insert({order_nsu:order,plan,amount_cents:selected.amount});
  if(insertError)throw insertError;
  const response=await fetch("https://api.checkout.infinitepay.io/links",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
   handle:"minhabarbeariapro",order_nsu:order,
   redirect_url:"https://agendocorte.com/cadastro?compra="+encodeURIComponent(order),
   webhook_url:"https://gozynjftplaquakpeprx.supabase.co/functions/v1/infinitepay-webhook",
   items:[{quantity:1,price:selected.amount,description:selected.label}]
  })});
  const data=await response.json();if(!response.ok)throw new Error("InfinitePay: "+JSON.stringify(data));
  const checkoutUrl=data.url??data.checkout_url??data.link??data.payment_url;
  if(typeof checkoutUrl!=="string"||!checkoutUrl.startsWith("https://"))throw new Error("Resposta de checkout inválida: "+JSON.stringify(data));
  const {error:updateError}=await admin.from("public_subscription_checkouts").update({checkout_url:checkoutUrl}).eq("order_nsu",order);
  if(updateError)throw updateError;
  return json({checkout_url:checkoutUrl,order_nsu:order});
 }catch(error){console.error("Public checkout error",error);return json({error:"checkout_unavailable",details:error instanceof Error?error.message:String(error)},500);}
});