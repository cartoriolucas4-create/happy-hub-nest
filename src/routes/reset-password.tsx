import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAuthenticatedArea, homeForArea } from "@/lib/auth-area";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova senha | BarberFlow" },
      { name: "description", content: "Defina uma nova senha para acessar seu painel." },
      { property: "og:title", content: "Nova senha | BarberFlow" },
      { property: "og:description", content: "Defina uma nova senha de acesso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (senha.length < 6) {
      toast.error("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (senha !== confirma) {
      toast.error("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        throw new Error("O link de recuperação não foi validado ou expirou. Solicite um novo link na tela de login.");
      }

      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;

      toast.success("Senha atualizada com sucesso!");
      let destination = "/login" as string;
      try {
        const session = await getAuthenticatedArea();
        if (session) destination = homeForArea(session.area);
      } catch (error) {
        console.error("[ResetPassword] Senha atualizada, mas não foi possível carregar as permissões:", error);
      }
      await navigate({ to: destination as "/login" | "/admin" | "/super-admin", replace: true });
    } catch (error) {
      console.error("[ResetPassword] Falha ao atualizar senha:", error);
      const message = error instanceof Error ? error.message : String(error ?? "");
      if (/failed to fetch|fetch failed|network|load failed|timeout/i.test(message)) {
        toast.error("Não foi possível conectar ao servidor de contas. Tente novamente.");
      } else {
        toast.error(message || "Não foi possível atualizar a senha. Solicite um novo link de recuperação.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <form onSubmit={salvar} className="w-full max-w-md space-y-4">
        <h1 className="text-3xl">Definir nova senha</h1>
        <p className="text-sm text-muted-foreground">Abra esta página pelo link enviado ao seu e-mail. Se o link expirou, solicite outro na tela de login.</p>
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Nova senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full rounded-md border border-input bg-card px-4 py-3 outline-none focus:border-primary"
          required
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Confirmar senha"
          value={confirma}
          onChange={(e) => setConfirma(e.target.value)}
          className="w-full rounded-md border border-input bg-card px-4 py-3 outline-none focus:border-primary"
          required
        />
        <button
          disabled={loading}
          className="w-full rounded-md bg-primary py-3 font-display text-lg tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "SALVANDO..." : "SALVAR SENHA"}
        </button>
        <p className="text-center text-sm text-muted-foreground"><Link to="/login" className="underline">Voltar ao login</Link></p>
      </form>
    </div>
  );
}
