import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Users,
  UserCog,
  Scissors,
  Ban,
  Settings,
  CreditCard,
  Images,
  Link2,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ShoppingCart,
  ReceiptText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AccessGate, LicenseBanner } from "@/components/admin/AccessGate";
import { useShop } from "@/lib/shop";

export const MENU = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/admin/agendamentos", label: "Agendamentos", icon: ClipboardList },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/barbeiros", label: "Barbeiros", icon: UserCog },
  { to: "/admin/servicos", label: "Serviços", icon: Scissors },
  { to: "/admin/bloqueios", label: "Bloqueios", icon: Ban },
  { to: "/admin/pagamentos", label: "Meios de pagamento", icon: CreditCard },
  { to: "/admin/galeria", label: "Galeria", icon: Images },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
  { to: "/admin/meu-link", label: "Meu link", icon: Link2 },
] as const;

export const SIDEBAR_GROUPS = [
  { key: "agenda", label: "Agenda", icon: CalendarDays, items: MENU.filter((m) => ["/admin/agenda", "/admin/agendamentos", "/admin/bloqueios"].includes(m.to)) },
  { key: "pessoas", label: "Pessoas", icon: Users, items: MENU.filter((m) => ["/admin/clientes", "/admin/barbeiros"].includes(m.to)) },
  { key: "operacao", label: "Operação", icon: Scissors, items: MENU.filter((m) => m.to === "/admin/servicos") },
  { key: "configuracoes", label: "Configurações", icon: Settings, items: [...MENU.filter((m) => ["/admin/pagamentos", "/admin/galeria", "/admin/configuracoes"].includes(m.to)), { to: "/admin/configurar", label: "Configuração inicial", icon: Settings }] },
  { key: "negocio", label: "Meu negócio", icon: Link2, items: MENU.filter((m) => m.to === "/admin/meu-link") },
] as const;

type SidebarGroupKey = (typeof SIDEBAR_GROUPS)[number]["key"];

function isActive(pathname: string, to: string) {
  return to === "/admin" ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
}

function groupForPath(pathname: string): SidebarGroupKey | null {
  const group = SIDEBAR_GROUPS.find((g) => g.items.some((item) => isActive(pathname, item.to)));
  return group?.key ?? null;
}

function readSavedGroups(): Partial<Record<SidebarGroupKey, boolean>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("barberflow:admin-sidebar-groups");
    return raw ? (JSON.parse(raw) as Partial<Record<SidebarGroupKey, boolean>>) : {};
  } catch {
    return {};
  }
}

function saveGroups(groups: Record<SidebarGroupKey, boolean>) {
  try {
    window.localStorage.setItem("barberflow:admin-sidebar-groups", JSON.stringify(groups));
  } catch {
    // A navegação continua funcionando mesmo se o navegador bloquear storage.
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
  const [groups, setGroups] = useState<Record<SidebarGroupKey, boolean>>(() => ({
    agenda: false,
    pessoas: false,
    operacao: false,
    configuracoes: false,
    negocio: false,
    ...readSavedGroups(),
  }));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: shop } = useShop();

  const { data: pendingAgendamentos = 0 } = useQuery({
    queryKey: ["pending-agendamentos", shop?.id],
    enabled: Boolean(shop?.id),
    refetchInterval: 30000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("barbershop_id", shop!.id)
        .eq("status", "pendente");
      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    const activeGroup = groupForPath(pathname);
    if (!activeGroup) return;
    setGroups((current) => {
      if (current[activeGroup]) return current;
      const next = { ...current, [activeGroup]: true };
      saveGroups(next);
      return next;
    });
  }, [pathname]);

  function toggleGroup(key: SidebarGroupKey) {
    setGroups((current) => {
      const next = { ...current, [key]: !current[key] };
      saveGroups(next);
      return next;
    });
  }

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Navegação da barbearia">
      <Link
        to="/admin"
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
          isActive(pathname, "/admin")
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
        Dashboard
      </Link>

      <Link
        to="/admin/vendas-externas"
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
          isActive(pathname, "/admin/vendas-externas")
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
        Vendas Externas
      </Link>

      <Link
        to="/admin/custos"
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
          isActive(pathname, "/admin/custos")
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <ReceiptText className="h-4 w-4" aria-hidden="true" />
        Custos
      </Link>

      {SIDEBAR_GROUPS.map((group) => {
        const active = group.items.some((item) => isActive(pathname, item.to));
        const expanded = groups[group.key];
        return (
          <div key={group.key}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => toggleGroup(group.key)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <group.icon className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            <div className={`grid transition-all duration-200 ease-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="min-h-0 overflow-hidden">
                <div className="ml-7 mt-1 flex flex-col gap-0.5 border-l border-border pl-2">
                  {group.items.map((item) => {
                    const itemActive = isActive(pathname, item.to);
                    const showPending = item.to === "/admin/agendamentos" && pendingAgendamentos > 0;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
                          itemActive
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="flex-1">{item.label}</span>
                        {showPending && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                            aria-label="Há agendamentos pendentes"
                            title="Há agendamentos pendentes"
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 p-4 lg:hidden">
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
            {pathname === "/admin" && <LicenseBanner />}
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
