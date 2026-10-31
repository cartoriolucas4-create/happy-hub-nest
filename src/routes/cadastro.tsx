import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isEmail, isPhone, slugify } from "@/lib/barber";
import { canonicalSiteUrl, isReservedPublicSlug } from "@/lib/public-links";
import { signupErrorMessage } from "@/lib/signup-errors";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar minha barbearia | BarberFlow" },
      {
        name: "description",
        content: "Cadastre sua barbearia e receba agendamentos online pelo seu link exclusivo.",
      },
      { property: "og:title", content: "Criar minha barbearia | BarberFlow" },
      { property: "og:description", content: "Cadastro gratuito da sua barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Cadastro,
});

function Cadastro() {
  const navigate = useNavigate();
  const [nomeBarbearia, setNomeBarbearia] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditado, setSlugEditado] = useState(false);
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [checando, setChecando] = useState(false);
  const [erroSlug, setErroSlug] = useState<string | null>(null);
  const [responsavel, setResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    const compra = new URLSearchParams(window.location.search).get("compra");
    if (!compra) return;
    let active = true;
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active || !sessionData.session?.user) return;
      await supabase.auth.updateUser({ data: { compra_order_nsu: compra } });
      const { data: claimData, error } = await (supabase as any).rpc("claim_paid_public_checkout", { p_order_nsu: compra });
      const claim = claimData as { ok?: boolean; reason?: string } | null;
      if (!active) return;
      if (!error && claim?.ok) {
        window.location.assign("/admin");
      } else if (!error && claim?.reason === "barbershop_not_created") {
        window.location.assign("/admin/configurar");
      }
    })();
    return () => { active = false; };
  }, []);

  const planoAtual = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("plano") : null;
  const slugFinal = slugify(slugEditado ? slug : nomeBarbearia);
  const slugReservado = isReservedPublicSlug(slugFinal);

  useEffect(() => {
    let active = true;
    setErroSlug(null);
    setDisponivel(null);
    if (slugFinal.length < 3 || slugReservado) {
      setChecando(false);
      setDisponivel(slugReservado ? false : null);
      return;
    }
    setChecando(true);
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("slug_disponivel", { p_slug: slugFinal });
        if (error) throw error;
        if (typeof data !== "boolean") throw new Error("Resposta inválida ao verificar o link.");
        if (active) setDisponivel(data);
      } catch (error) {
        if (active) setErroSlug(signupErrorMessage(error, "slug"));
      } finally {
        if (active) setChecando(false);
      }
    }, 450);
    return () => { active = false; clearTimeout(t); };
  }, [slugFinal, slugReservado]);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (nomeBarbearia.trim().length < 3) {
      toast.error("Informe o nome da barbearia.");
      return;
    }
    if (slugFinal.length < 3 || slugReservado || disponivel === false) {
      toast.error(slugReservado ? "Esse link é reservado pelo sistema. Escolha outro." : "Escolha um link disponível para sua barbearia.");
      return;
    }
    if (responsavel.trim().length < 3) {
      toast.error("Informe o nome do responsável.");
      return;
    }
    if (!isEmail(email)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    if (!isPhone(telefone)) {
      toast.error("Informe um telefone válido com DDD.");
      return;
    }
    if (senha.length < 6) {
      toast.error("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (senha !== confirma) {
      toast.error("As senhas não conferem.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const planoSolicitado = params.get("plano");
    const planoValido = planoSolicitado === "mensal" || planoSolicitado === "semestral" || planoSolicitado === "anual" ? planoSolicitado : null;

    setLoading(true);
    let step: "slug" | "auth" = "slug";
    try {
      // Recheck at submission; never treat a failed availability request as approval.
      const availability = await supabase.rpc("slug_disponivel", { p_slug: slugFinal });
      if (availability.error) throw availability.error;
      if (availability.data !== true) {
        if (availability.data === false) {
          setDisponivel(false);
          toast.error("Esse link já está em uso. Escolha outro.");
          return;
        }
        throw new Error("Resposta inválida ao verificar o link.");
      }
      step = "auth";
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        emailRedirectTo: canonicalSiteUrl("/"),
        data: {
          nome: responsavel.trim(),
          telefone: telefone.trim(),
          barbershop_nome: nomeBarbearia.trim(),
          barbershop_slug: slugFinal,
          plano_solicitado: planoValido,
          compra_order_nsu: params.get("compra") || null,
        },
      },
    });
    if (error) throw error;
    if (!data.session) {
      setEnviado(true);
      return;
    }
    toast.success("Conta criada! Vamos configurar sua barbearia.");
    await navigate({ to: planoValido ? "/admin/assinatura" : "/admin/configurar", search: planoValido ? { plano: planoValido } : undefined, replace: true });
    } catch (error) {
      toast.error(signupErrorMessage(error, step));
    } finally {
      setLoading(false);
    }
  }

  if (enviado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
        <div className="max-w-md">
          <Check className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <h1 className="mt-6 text-3xl">Confirme seu e-mail</h1>
          <p className="mt-3 text-muted-foreground">
            Enviamos um link de confirmação para <strong>{email}</strong>. Depois de confirmar,
            entre na plataforma para configurar sua barbearia.
          </p>
          <Link
            to="/login"
            search={{ plano: planoAtual || undefined }}
            className="mt-8 inline-block rounded-sm bg-primary px-7 py-3 font-display tracking-widest text-primary-foreground"
          >
            IR PARA O LOGIN
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 py-12">
      <div className="mx-auto w-full max-w-lg">
        <Link to="/" className="font-display text-2xl tracking-[0.2em]">
          BARBER<span className="text-primary">FLOW</span>
        </Link>
        <h1 className="mt-8 text-3xl">Criar minha barbearia</h1>
        <p className="mt-2 text-sm text-muted-foreground">Leva menos de dois minutos.</p>

        <form onSubmit={cadastrar} className="mt-8 space-y-4">
          <Field label="Nome da barbearia">
            <input
              value={nomeBarbearia}
              onChange={(e) => setNomeBarbearia(e.target.value)}
              className={inputCls}
              required
            />
          </Field>

          <Field label="Seu link público">
            <div className="mt-2 flex items-center overflow-hidden rounded-md border border-input bg-card">
              <span className="px-3 text-sm text-muted-foreground">/</span>
              <input
                value={slugEditado ? slug : slugFinal}
                onChange={(e) => {
                  setSlugEditado(true);
                  setSlug(e.target.value);
                }}
                className="flex-1 bg-transparent py-3 pr-3 outline-none"
              />
              <span className="px-3">
                {checando ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : disponivel === true ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : disponivel === false ? (
                  <X className="h-4 w-4 text-destructive" />
                ) : null}
              </span>
            </div>
            {disponivel === false && (
              <span className="mt-1 block text-xs text-destructive">
                {slugReservado ? "Esse link é reservado pelo sistema." : "Esse link já está em uso."}
              </span>
            )}
            {erroSlug && <span role="alert" className="mt-1 block text-xs text-destructive">{erroSlug}</span>}
          </Field>

          <Field label="Nome do responsável">
            <input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="E-mail">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Telefone">
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Senha">
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Confirmar senha">
            <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} className={inputCls} required />
          </Field>

          <button
            disabled={loading}
            className="w-full rounded-md bg-primary py-3 font-display text-lg tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "CRIANDO..." : "CRIAR CONTA"}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/login" className="text-primary underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputCls =
  "mt-2 w-full rounded-md border border-input bg-card px-4 py-3 outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
