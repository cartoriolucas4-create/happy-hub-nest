import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova senha | BarberFlow" },
      { name: "description", content: "Defina uma nova senha para acessar seu painel." },
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
  const [validando, setValidando] = useState(true);
  const [recoveryValid, setRecoveryValid] = useState(false);
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    let active = true;
    let recoveryEventSeen = false;

    // Supabase consumes the recovery token from the email URL and emits
    // PASSWORD_RECOVERY. Also support PKCE links containing ?code=...
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        recoveryEventSeen = true;
        setRecoveryValid(true);
        setLinkError("");
        setValidando(false);
      } else if (event === "SIGNED_OUT") {
        setRecoveryValid(false);
      }
    });

    const validateRecoveryLink = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          const { data } = await supabase.auth.getSession();
          if (active && data.session) {
            setRecoveryValid(true);
            setLinkError("");
          }
          return;
        }

        // Allow the SDK a moment to process the access_token/hash and emit
        // PASSWORD_RECOVERY before deciding that the link is invalid.
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active) return;
        if (data.session && (recoveryEventSeen || url.hash.includes("type=recovery"))) {
          setRecoveryValid(true);
          setLinkError("");
        } else {
          setRecoveryValid(false);
          setLinkError("Este link não é válido ou já expirou. Solicite uma nova recuperação de senha na tela de login.");
        }
      } catch (error) {
        if (!active) return;
        console.error("[ResetPassword] Não foi possível validar o link:", error);
        setRecoveryValid(false);
        setLinkError("Não foi possível validar o link. Solicite um novo link de recuperação.");
      } finally {
        if (active) setValidando(false);
      }
    };

    void validateRecoveryLink();
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!recoveryValid) {
      toast.error("Abra o link de recuperação enviado ao seu e-mail antes de definir a senha.");
      return;
    }
    if (senha.length < 8) {
      toast.error("A nova senha deve ter ao menos 8 caracteres.");
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
        throw new Error("O link de recuperação expirou. Solicite um novo link na tela de login.");
      }

      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;

      toast.success("Senha atualizada com sucesso! Entre novamente com sua nova senha.");
      await supabase.auth.signOut();
      await navigate({ to: "/login", replace: true });
    } catch (error) {
      console.error("[ResetPassword] Falha ao atualizar senha:", error);
      const message = error instanceof Error ? error.message : String(error ?? "");
      toast.error(message || "Não foi possível atualizar a senha. Solicite um novo link de recuperação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md">
        <form onSubmit={salvar} className="space-y-4">
          <h1 className="text-3xl">Definir nova senha</h1>
          {validando ? (
            <p className="text-sm text-muted-foreground">Validando o link de recuperação...</p>
          ) : recoveryValid ? (
            <>
              <p className="text-sm text-muted-foreground">Crie uma nova senha para sua conta.</p>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Nova senha (mínimo 8 caracteres)"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full rounded-md border border-input bg-card px-4 py-3 outline-none focus:border-primary"
                minLength={8}
                required
              />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Repetir nova senha"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                className="w-full rounded-md border border-input bg-card px-4 py-3 outline-none focus:border-primary"
                minLength={8}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-primary py-3 font-display text-lg tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? "SALVANDO..." : "SALVAR NOVA SENHA"}
              </button>
            </>
          ) : (
            <div role="alert" className="space-y-3">
              <p className="text-sm text-destructive">{linkError}</p>
              <Link to="/login" className="inline-block text-sm underline">Voltar ao login e solicitar outro link</Link>
            </div>
          )}
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="underline">Voltar ao login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
