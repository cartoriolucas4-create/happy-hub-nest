import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) throw new Error("Não autorizado");
    const { userId, password } = await request.json();
    if (typeof userId !== "string" || typeof password !== "string" || password.length < 8) {
      throw new Error("Dados inválidos");
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Validate the caller through the database guard using their JWT, not a client-provided identity.
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { error: guardError } = await caller.rpc("sa_require");
    if (guardError) throw new Error("Não autorizado");
    const admin = createClient(url, serviceKey);
    const { data: targetRole, error: roleError } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();
    if (roleError || targetRole) throw new Error("Operação não permitida");
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password });
    if (updateError) throw new Error("Não foi possível alterar a senha");
    const { error: auditError } = await caller.rpc("sa_registrar_alteracao_senha", {
      p_user_id: userId,
    });
    if (auditError) throw new Error("Senha alterada, mas o histórico não pôde ser registrado");
    return Response.json(
      { ok: true },
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha na operação" },
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
