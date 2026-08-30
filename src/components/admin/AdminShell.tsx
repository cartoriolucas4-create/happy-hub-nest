import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
  CreditCard,
  Images,
  Link2,
  LogOut,
  Menu,
  X,
  ChevronDown,
  BriefcaseBusiness,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AccessGate } from "@/components/admin/AccessGate";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const NAV_GROUPS = [
  {
    id: "agenda",
    label: "Agenda",
    icon: CalendarDays,
    items: [
      { to: "/admin/agenda", label: "Agenda", icon: CalendarDays },
      { to: "/admin/agendamentos", label: "Agendamentos", icon: ClipboardList },
      { to: "/admin/bloqueios", label: "Bloqueios", icon: Ban },
    ],
  },
  {
    id: "equipe-clientes",
    label: "Equipe e clientes",
    icon: Users,
    items: [
      { to: "/admin/clientes", label: "Clientes", icon: Users },
      { to: "/admin/barbeiros", label: "Barbeiros", icon: UserCog },
    ],
  },
  {
    id: "servicos",
    label: "Serviços",
    icon: Scissors,
    items: [
      { to: "/admin/servicos", label: "Serviços", icon: Scissors },
      { to: "/admin/horarios", label: "Horários", icon: Clock },
    ],
  },
  {
    id: "gestao",
    label: "Gestão",
    icon: BriefcaseBusiness,
    items: [
      { to: "/admin/pagamentos", label: "Meios de pagamento", icon: CreditCard },
      { to: "/admin/galeria", label: "Galeria", icon: Images },
      { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
      { to: "/admin/configurar", label: "Configuração inicial", icon: Settings },
    ],
  },
  {
    id: "meu-negocio",
    label: "Meu negócio",
    icon: Link2,
    items: [{ to: "/admin/meu-link", label: "Meu link", icon: Link2 }],
  },
] as const;

type GroupId = (typeof NAV_GROUPS)[number]["id"];
type ExpandedGroups = Record<GroupId, boolean>;
const SIDEBAR_STORAGE_KEY = "barberflow.sidebar.groups";

function initialExpandedGroups(): ExpandedGroups {
  const defaults: ExpandedGroups = {
    agenda: false,
    "equipe-clientes": false,
    servicos: false,
    gestao: false,
    "meu-negocio": false,
  };
  if (typeof window === "undefined") return defaults;
  try {
    const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved ? { ...defaults, ...(JSON.parse(saved) as Partial<ExpandedGroups>) } : defaults;
  } catch {
    return defaults;
  }
}

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
  const [expandedGroups, setExpandedGroups] = useState<ExpandedGroups>(initialExpandedGroups);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  function toggleGroup(id: GroupId, open: boolean) {
    setExpandedGroups((current) => ({ ...current, [id]: open }));
  }

  const nav = (
    <nav className="flex flex-col gap-1.5">
      <p className="px-3 pt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Início
      </p>
      <Link
        to="/admin"
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          pathname === "/admin"
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
        Dashboard
      </Link>

      {NAV_GROUPS.map((group) => {
        const groupActive = group.items.some((item) => pathname.startsWith(item.to));
        const expanded = groupActive || expandedGroups[group.id];
        const GroupIcon = group.icon;
        return (
          <Collapsible
            key={group.id}
            open={expanded}
            onOpenChange={(value) => toggleGroup(group.id, value)}
          >
            <CollapsibleTrigger className="group flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <GroupIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="flex-1">{group.label}</span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className="ml-4 border-l border-border/70 py-0.5 pl-2">
                {group.items.map((item) => {
                  const active = pathname.startsWith(item.to);
                  const ItemIcon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <ItemIcon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
      <button
        onClick={sair}
        className="mt-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-destructive"
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
          <div className="mt-8 pb-16">
            <AccessGate>{children}</AccessGate>
          </div>
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
