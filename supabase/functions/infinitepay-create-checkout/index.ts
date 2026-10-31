import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS" };
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const plans={mensal:{amount:5999,months:1,label:"Plano mensal Minha Barbearia"},semestral:{amount:23994,months:6,label:"Plano semestral Minha Barbearia"},anual:{amount:29999,months:12,label:"Plano anual Minha Barbearia"}} as const;
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return json({error:"method_not_allowed"},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth=req.headers.get("Authorization");if(!auth)return json({error:"unauthorized"},401);
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:a}=await client.auth.getUser();if(a||!user)return json({error:"unauthorized"},401);
  const body=await req.json();const plan=String(body?.plan||"") as keyof typeof plans;if(!(plan in plans))return json({error:"invalid_plan"},400);
  const admin=createClient(url,service);const {data:shop,error:s}=await admin.from("barbershops").select("id").eq("owner_id",user.id).maybeSingle();
  if(s||!shop)return json({error:"barbershop_not_found"},404);
  const p=plans[plan],order="MB"+crypto.randomUUID().replaceAll("-","").toUpperCase();
  const {error:ie}=await admin.from("subscription_orders").insert({order_nsu:order,user_id:user.id,barbershop_id:shop.id,plan,amount_cents:p.amount,duration_months:p.months});
  if(ie)throw ie;
  const site=Deno.env.get("SITE_URL")||"https://agendocorte.com";
  const resp=await fetch("https://api.checkout.infinitepay.io/links",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({handle:"minhabeariapro",order_nsu:order,redirect_url:site+"/assinatura/retorno?order_nsu="+encodeURIComponent(order),webhook_url:"https://xcsbvlpsbonekvmavddh.supabase.co/functions/v1/infinitepay-webhook",items:[{quantity:1,price:p.amount,description:p.label}]})});
  const data=await resp.json();if(!resp.ok)throw new Error("InfinitePay checkout error "+JSON.stringify(data));
  const checkoutUrl=data.url||data.checkout_url||data.link;if(!checkoutUrl)throw new Error("InfinitePay did not return checkout URL");
  await admin.from("subscription_orders").update({checkout_url:checkoutUrl}).eq("order_nsu",order);
  return json({checkout_url:checkoutUrl,order_nsu:order});
 }catch(e){console.error(e);return json({error:"checkout_unavailable",detail:String(e)},500);}
});