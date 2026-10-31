import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const plans={mensal:{amount:5999,label:"Minha Barbearia - Plano mensal"},semestral:{amount:23994,label:"Minha Barbearia - Plano semestral"},anual:{amount:29999,label:"Minha Barbearia - Plano anual"}} as const;
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 try{
  const auth=req.headers.get("Authorization");if(!auth)return json({error:"unauthorized"},401);
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}}}),{data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return json({error:"unauthorized"},401);
  const body=await req.json(),plan=String(body?.plan??"") as keyof typeof plans;if(!Object.prototype.hasOwnProperty.call(plans,plan))return json({error:"invalid_plan"},400);
  const admin=createClient(url,service),{data:shop,error:shopError}=await admin.from("barbershops").select("id").eq("owner_id",user.id).maybeSingle();
  if(shopError)throw shopError;if(!shop)return json({error:"barbershop_not_found"},404);
  const selected=plans[plan],order="MB"+crypto.randomUUID().replaceAll("-","").toUpperCase();
  const {error:insertError}=await admin.from("subscription_orders").insert({order_nsu:order,user_id:user.id,barbershop_id:shop.id,plan,amount_cents:selected.amount});
  if(insertError)throw insertError;
  const webhookUrl="https://gozynjftplaquakpeprx.supabase.co/functions/v1/infinitepay-webhook";
  const redirectUrl="https://agendocorte.com/?assinatura=retorno&order_nsu="+encodeURIComponent(order);
  const response=await fetch("https://api.checkout.infinitepay.io/links",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({handle:"minhabeariapro",order_nsu:order,redirect_url:redirectUrl,webhook_url:webhookUrl,items:[{quantity:1,price:selected.amount,description:selected.label}]})});
  const data=await response.json();if(!response.ok)throw new Error("InfinitePay checkout error "+JSON.stringify(data));
  const checkoutUrl=data.url??data.checkout_url??data.link??data.payment_url;if(typeof checkoutUrl!=="string"||!checkoutUrl.startsWith("https://"))throw new Error("InfinitePay checkout URL missing");
  const {error:updateError}=await admin.from("subscription_orders").update({checkout_url:checkoutUrl}).eq("order_nsu",order);if(updateError)throw updateError;
  return json({checkout_url:checkoutUrl,order_nsu:order});
 }catch(e){console.error("InfinitePay checkout error",e);return json({error:"checkout_unavailable"},500);}
});