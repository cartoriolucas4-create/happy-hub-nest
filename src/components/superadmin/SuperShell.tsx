import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  KeyRound,
  History,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/lib/license";

const MENU = [
  { to: "/super-admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/super-admin/clientes", label: "Clientes", icon: Users },
  { to: "/super-admin/acessos", label: "Acessos expirando", icon: KeyRound },
  { to: "/super-admin/historico", label: "Histórico", icon: History },
  { to: "/super-admin/whatsapp", label: "WhatsApp da equipe", icon: MessageCircle },
] as const;

export function SuperShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: isSuper, isLoading } = useIsSuperAdmin();

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {MENU.map((m) => {
        const active = m.to === "/super-admin" ? pathname === "/super-admin" : pathname === m.to || pathname.startsWith(`${m.to}/`);
        return (
          <Link key={m.to} to={m.to} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <m.icon className="h-4 w-4" aria-hidden="true" />
            {m.label}
          </Link>
        );
      })}
      <button onClick={sair} className="mt-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-destructive">
        <LogOut className="h-4 w-4" aria-hidden="true" /> Sair
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#14202b] text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-700 bg-[#101923] p-4 lg:block">
        <Link to="/super-admin" className="block px-3 font-display text-lg tracking-[0.15em] text-slate-100">PAINEL <span className="text-sky-300">PLATAFORMA</span></Link>
        <div className="mt-8">{nav}</div>
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-700 bg-[#101923]/95 px-4 py-3 backdrop-blur lg:hidden">
        <span className="font-display text-lg tracking-[0.2em]">PAINEL <span className="text-sky-300">PLATAFORMA</span></span>
        <button onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu className="h-6 w-6" /></button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-[#101923]/95 p-4 lg:hidden">
          <div className="flex items-center justify-between px-3"><span className="font-display text-lg tracking-[0.2em]">MENU</span><button onClick={() => setOpen(false)} aria-label="Fechar menu"><X className="h-6 w-6" /></button></div>
          <div className="mt-6">{nav}</div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl md:text-4xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}</div>{actions}</div>
          <div className="mt-8 pb-16">
            {isLoading ? <p className="text-sm text-muted-foreground">Verificando permissão...</p> : isSuper ? children : (
              <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-8 text-center">
                <ShieldAlert className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
                <h2 className="mt-5 text-2xl">Acesso restrito</h2>
                <p className="mt-3 text-sm text-muted-foreground">Esta área é exclusiva do administrador geral da plataforma.</p>
                <Link to="/admin" className="mt-6 inline-block rounded-md border border-border px-5 py-2.5 text-sm hover:border-primary hover:text-primary">Ir para o meu painel</Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export const sInput = "w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary";
export const sBtn = "rounded-md bg-primary px-5 py-2.5 font-display text-sm tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-60";
export const sBtnGhost = "rounded-md border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary";
