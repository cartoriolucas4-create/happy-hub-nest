import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isEmail } from "@/lib/barber";
import { getAuthenticatedArea, homeForArea } from "@/lib/auth-area";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar | BarberFlow" },
      { name: "description", content: "Acesse o painel administrativo da sua barbearia." },
      { property: "og:title", content: "Entrar | BarberFlow" },
      { property: "og:description", content: "Acesse o painel da sua barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [recuperando, setRecuperando] = useState(false);

  useEffect(() => {
    getAuthenticatedArea().then((session) => {
      if (session) navigate({ to: homeForArea(session.area), replace: true });
    });
  }, [navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!isEmail(email)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setLoading(false);
    if (error) {
      toast.error("E-mail ou senha inválidos.");
      return;
    }
    const session = await getAuthenticatedArea();
    if (!session) {
      await supabase.auth.signOut();
      toast.error("Não foi possível determinar as permissões da conta.");
      return;
    }
    navigate({ to: homeForArea(session.area), replace: true });
  }

  async function esqueci() {
    if (!isEmail(email)) {
      toast.error("Informe seu e-mail para recuperar a senha.");
      return;
    }
    setRecuperando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setRecuperando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Enviamos um link de recuperação para seu e-mail.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-2xl tracking-[0.2em]">
          BARBER<span className="text-primary">FLOW</span>
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
            disabled={loading}
            className="w-full rounded-md bg-primary py-3 font-display text-lg tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "ENTRANDO..." : "ENTRAR"}
          </button>
        </form>

        <button
          onClick={esqueci}
          disabled={recuperando || loading}
          className="mt-4 text-sm text-muted-foreground underline hover:text-primary"
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
