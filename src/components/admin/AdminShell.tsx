import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Users,
  UserCog,
  Scissors,
  Clock,
  Ban,
  Settings,
  Images,
  Link2,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const MENU = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/admin/agendamentos", label: "Agendamentos", icon: ClipboardList },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/barbeiros", label: "Barbeiros", icon: UserCog },
  { to: "/admin/servicos", label: "Serviços", icon: Scissors },
  { to: "/admin/horarios", label: "Horários", icon: Clock },
  { to: "/admin/bloqueios", label: "Bloqueios", icon: Ban },
  { to: "/admin/pagamentos", label: "Métodos de pagamento", icon: CreditCard },
  { to: "/admin/galeria", label: "Galeria", icon: Images },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
  { to: "/admin/meu-link", label: "Meu link", icon: Link2 },
] as const;

export function AdminShell({
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

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {MENU.map((m) => {
        const active = m.to === "/admin" ? pathname === "/admin" : pathname.startsWith(m.to);
        return (
          <Link
            key={m.to}
            to={m.to}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <m.icon className="h-4 w-4" aria-hidden="true" />
            {m.label}
          </Link>
        );
      })}
      <button
        onClick={sair}
        className="mt-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-destructive"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" /> Sair
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-sidebar p-4 lg:block">
        <Link to="/admin" className="block px-3 font-display text-xl tracking-[0.2em]">
          BARBER<span className="text-primary">FLOW</span>
        </Link>
        <div className="mt-8">{nav}</div>
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <span className="font-display text-lg tracking-[0.2em]">
          BARBER<span className="text-primary">FLOW</span>
        </span>
        <button onClick={() => setOpen(true)} aria-label="Abrir menu">
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-background/95 p-4 lg:hidden">
          <div className="flex items-center justify-between px-3">
            <span className="font-display text-lg tracking-[0.2em]">MENU</span>
            <button onClick={() => setOpen(false)} aria-label="Fechar menu">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="mt-6">{nav}</div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {actions}
          </div>
          <div className="mt-8 pb-16">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export const input =
  "w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary";
export const btn =
  "rounded-md bg-primary px-5 py-2.5 font-display text-sm tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-60";
export const btnGhost =
  "rounded-md border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary";
