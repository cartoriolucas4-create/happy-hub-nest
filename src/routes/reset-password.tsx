import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
    if (senha.length < 6) {
      toast.error("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (senha !== confirma) {
      toast.error("As senhas não conferem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada!");
    const session = await getAuthenticatedArea();
    navigate({ to: session ? homeForArea(session.area) : "/login", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <form onSubmit={salvar} className="w-full max-w-md space-y-4">
        <h1 className="text-3xl">Definir nova senha</h1>
        <input
          type="password"
          placeholder="Nova senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full rounded-md border border-input bg-card px-4 py-3 outline-none focus:border-primary"
          required
        />
        <input
          type="password"
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
      </form>
    </div>
  );
}
