import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isEmail } from "@/lib/barber";
import { getAuthenticatedArea, homeForArea } from "@/lib/auth-area";
import { canonicalSiteUrl } from "@/lib/public-links";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar | Minha Barbearia" },
      { name: "description", content: "Acesse o painel administrativo da sua barbearia." },
      { property: "og:title", content: "Entrar | Minha Barbearia" },
      { property: "og:description", content: "Acesse o painel da sua barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function readableAuthError(error: unknown, action: "login" | "recovery") {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/failed to fetch|fetch failed|network|load failed|timeout|ERR_NAME_NOT_RESOLVED/i.test(message)) {
    return "Não foi possível conectar ao servidor de contas. Verifique a conexão e a configuração do serviço e tente novamente.";
  }
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(message)) return "Confirme seu e-mail antes de entrar. Verifique também a caixa de spam.";
  if (/redirect|url.*not.*allowed|not.*allow.*url/i.test(message)) {
    return "O endereço de retorno não está autorizado no serviço de autenticação. É necessário liberar https://agendocorte.com/** nas URLs de redirecionamento.";
  }
  return action === "recovery"
    ? `Não foi possível enviar o link de recuperação: ${message}`
    : `Não foi possível entrar: ${message}`;
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [recuperando, setRecuperando] = useState(false);

  useEffect(() => {
    let active = true;
    void getAuthenticatedArea()
      .then(async (session): Promise<void> => {
        if (active && session) {
          await navigate({ to: homeForArea(session.area), replace: true });
        }
      })
      .catch((error) => {
        console.error("[Login] Não foi possível verificar a sessão existente:", error);
      });
    return () => { active = false; };
  }, [navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (loading || recuperando) return;
    if (!isEmail(email)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    if (!senha) {
      toast.error("Informe sua senha.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });
      if (error) throw error;

      const session = await getAuthenticatedArea();
      if (!session) {
        await supabase.auth.signOut().catch(() => undefined);
        throw new Error("A conta foi autenticada, mas não foi possível carregar suas permissões. Verifique se o banco de dados está conectado e atualizado.");
      }
      await navigate({ to: homeForArea(session.area), replace: true });
    } catch (error) {
      console.error("[Login] Falha ao entrar:", error);
      toast.error(readableAuthError(error, "login"));
    } finally {
      setLoading(false);
    }
  }

  async function esqueci() {
    if (loading || recuperando) return;
    if (!isEmail(email)) {
      toast.error("Digite seu e-mail no campo acima para receber o link de recuperação.");
      return;
    }

    setRecuperando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: canonicalSiteUrl("/reset-password"),
      });
      if (error) throw error;
      toast.success("Se esse e-mail estiver cadastrado, enviaremos um link de recuperação. Confira também a caixa de spam.");
    } catch (error) {
      console.error("[Login] Falha ao solicitar recuperação:", error);
      toast.error(readableAuthError(error, "recovery"));
    } finally {
      setRecuperando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-2xl tracking-[0.2em]">
          MINHA <span className="text-primary">BARBEARIA</span>
        </Link>
        <h1 className="mt-8 text-3xl">Entrar</h1>
        <p className="mt-2 text-sm text-muted-foreground">Acesse o painel da sua barbearia.</p>

        <form onSubmit={entrar} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">E-mail</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-card px-4 py-3 outline-none focus:border-primary"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-card px-4 py-3 outline-none focus:border-primary"
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading || recuperando}
            className="w-full rounded-md bg-primary py-3 font-display text-lg tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "ENTRANDO..." : "ENTRAR"}
          </button>
        </form>

        <button
          type="button"
          onClick={esqueci}
          disabled={recuperando || loading}
          className="mt-4 text-sm text-muted-foreground underline hover:text-primary disabled:opacity-60"
        >
          {recuperando ? "Enviando..." : "Esqueci minha senha"}
        </button>

        <p className="mt-8 text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link to="/cadastro" className="text-primary underline">
            Cadastre sua barbearia
          </Link>
        </p>
      </div>
    </div>
  );
}
