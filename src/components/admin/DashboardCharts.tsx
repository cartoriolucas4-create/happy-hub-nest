import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { addDays, brl } from "@/lib/barber";

type ChartAppointment = {
  valor: number | string;
  status: string;
  data: string;
  payment_received_at?: string | null;
};

type FinanceSummary = {
  online_revenue?: number | string;
  external_revenue?: number | string;
  expenses?: number | string;
  product_cost?: number | string;
  total_revenue?: number | string;
  net_profit?: number | string;
};

type Period = "today" | "7d" | "30d" | "month";

const chartColors = {
  blue: "#3b82f6",
  cyan: "#06b6d4",
  purple: "#8b5cf6",
  pink: "#ec4899",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#f43f5e",
};

const currencyTick = (value: number) =>
  Number(value).toLocaleString("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  });

const tooltipCurrency = (value: number | string) => brl(Number(value));

const tooltipStyle = {
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.22)",
  background: "rgba(15, 23, 42, 0.96)",
  color: "#f8fafc",
  boxShadow: "0 16px 40px rgba(0,0,0,.35)",
};

export function DashboardCharts({
  appointments,
  finance,
  period,
  from,
  to,
}: {
  appointments: ChartAppointment[];
  finance?: FinanceSummary | null;
  period: Period;
  from: string;
  to: string;
}) {
  const confirmed = appointments.filter(
    (appointment) =>
      (appointment.status === "confirmado" || appointment.status === "concluido") &&
      Boolean(appointment.payment_received_at),
  );

  const revenueByDay = Array.from({ length: Math.max(1, daysBetween(from, to) + 1) }, (_, index) => {
    const date = addDays(from, index);
    const total = confirmed
      .filter((appointment) => appointment.payment_received_at?.slice(0, 10) === date)
      .reduce((sum, appointment) => sum + Number(appointment.valor), 0);
    return { date, label: date.slice(8, 10) + "/" + date.slice(5, 7), revenue: total };
  });

  const online = Number(finance?.online_revenue ?? 0);
  const external = Number(finance?.external_revenue ?? 0);
  const expenses = Number(finance?.expenses ?? 0);
  const productCost = Number(finance?.product_cost ?? 0);
  const revenue = Number(finance?.total_revenue ?? online + external);
  const profit = Number(finance?.net_profit ?? revenue - expenses - productCost);

  const revenueMix = [
    { name: "Vendas online", value: online, color: chartColors.blue },
    { name: "Vendas externas", value: external, color: chartColors.purple },
  ].filter((item) => item.value > 0);

  const financialResult = [
    { name: "Faturamento", value: revenue, color: chartColors.blue },
    { name: "Despesas", value: expenses, color: chartColors.red },
    { name: "Produtos", value: productCost, color: chartColors.amber },
    { name: "Lucro líquido", value: profit, color: chartColors.green },
  ];

  const periodLabel = period === "today" ? "Hoje" : period === "7d" ? "Últimos 7 dias" : period === "30d" ? "Últimos 30 dias" : "Este mês";
  const positiveProfit = profit >= 0;
  const onlinePercent = revenue > 0 ? Math.round((online / revenue) * 100) : 0;
  const externalPercent = revenue > 0 ? Math.round((external / revenue) * 100) : 0;

  return (
    <section className="mt-8 space-y-5" aria-label="Gráficos do resumo financeiro">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg shadow-violet-500/20">
              <span className="text-lg font-bold text-white">▥</span>
            </span>
            <h2 className="text-2xl font-bold tracking-tight">Visão dos resultados</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Acompanhe o desempenho do seu negócio em tempo real com gráficos interativos.</p>
        </div>
        <div className="rounded-full border border-border/60 bg-card/70 px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm">
          Período: <span className="text-foreground">{periodLabel}</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Faturamento por dia"
          description="Recebimentos confirmados e concluídos no período selecionado."
          icon="▥"
          iconClass="bg-emerald-500/15 text-emerald-400 ring-emerald-500/20"
          accent="from-emerald-500/10 via-blue-500/5 to-transparent"
          badge={revenue > 0 ? "Receita" : "Sem vendas"}
        >
          <div className="mb-1 mt-1 flex items-end justify-between px-1">
            <div>
              <p className="text-3xl font-bold tracking-tight">{brl(revenue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">total recebido no período</p>
            </div>
            {revenue > 0 && <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">● ativo</span>}
          </div>
          <ResponsiveContainer width="100%" height={275}>
            <AreaChart data={revenueByDay} margin={{ top: 22, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="dashboardRevenueFillModern" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.blue} stopOpacity={0.55} />
                  <stop offset="45%" stopColor={chartColors.purple} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={chartColors.purple} stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="dashboardRevenueStrokeModern" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={chartColors.cyan} />
                  <stop offset="55%" stopColor={chartColors.blue} />
                  <stop offset="100%" stopColor={chartColors.purple} />
                </linearGradient>
                <filter id="dashboardRevenueGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="4 6" stroke="rgba(148,163,184,.14)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} minTickGap={18} />
              <YAxis tickFormatter={currencyTick} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={42} />
              <Tooltip formatter={(value) => tooltipCurrency(Number(value))} labelFormatter={(label) => `Dia ${label}`} contentStyle={tooltipStyle} cursor={{ stroke: "rgba(139,92,246,.45)", strokeWidth: 1 }} />
              <Area type="monotone" dataKey="revenue" name="Faturamento" stroke="url(#dashboardRevenueStrokeModern)" strokeWidth={3} fill="url(#dashboardRevenueFillModern)" activeDot={{ r: 7, fill: chartColors.purple, stroke: "#fff", strokeWidth: 2, filter: "url(#dashboardRevenueGlow)" }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Origem do faturamento"
          description="Distribuição entre vendas online e vendas externas."
          icon="◔"
          iconClass="bg-violet-500/15 text-violet-400 ring-violet-500/20"
          accent="from-violet-500/10 via-blue-500/5 to-transparent"
          badge={`${onlinePercent + externalPercent}% distribuído`}
        >
          <div className="relative min-h-[275px]">
            {revenueMix.length > 0 ? (
              <div className="grid h-full items-center gap-2 sm:grid-cols-[1fr_1fr]">
                <div className="relative h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <linearGradient id="dashboardOnlinePie" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={chartColors.cyan} /><stop offset="100%" stopColor={chartColors.blue} /></linearGradient>
                        <linearGradient id="dashboardExternalPie" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={chartColors.pink} /><stop offset="100%" stopColor={chartColors.purple} /></linearGradient>
                      </defs>
                      <Pie data={revenueMix} dataKey="value" nameKey="name" innerRadius={70} outerRadius={101} paddingAngle={5} stroke="rgba(15,23,42,.8)" strokeWidth={3}>
                        {revenueMix.map((entry, index) => <Cell key={entry.name} fill={index === 0 ? "url(#dashboardOnlinePie)" : "url(#dashboardExternalPie)"} />)}
                      </Pie>
                      <Tooltip formatter={(value) => tooltipCurrency(Number(value))} contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground">Total</p>
                      <p className="mt-1 text-xl font-bold">{brl(revenue)}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 px-2">
                  {revenueMix.map((item, index) => {
                    const percentage = revenue > 0 ? Math.round((item.value / revenue) * 100) : 0;
                    return (
                      <div key={item.name} className="rounded-xl border border-border/60 bg-background/40 p-3 transition-transform duration-200 hover:-translate-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-xs font-medium"><span className="h-2.5 w-2.5 rounded-full shadow-lg" style={{ background: item.color }} />{item.name}</span>
                          <span className="text-sm font-bold">{percentage}%</span>
                        </div>
                        <p className="mt-2 text-lg font-semibold">{brl(item.value)}</p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${percentage}%`, background: index === 0 ? `linear-gradient(90deg, ${chartColors.cyan}, ${chartColors.blue})` : `linear-gradient(90deg, ${chartColors.pink}, ${chartColors.purple})` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Nenhum faturamento registrado no período.</div>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Resultado financeiro"
          description="Comparação dos principais valores que formam o resultado do período."
          icon="▥"
          iconClass="bg-amber-500/15 text-amber-400 ring-amber-500/20"
          accent="from-amber-500/10 via-emerald-500/5 to-transparent"
          badge={positiveProfit ? `Lucro ${brl(profit)}` : `Resultado ${brl(profit)}`}
          badgeClass={positiveProfit ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={financialResult} margin={{ top: 30, right: 8, left: -8, bottom: 4 }} barCategoryGap="22%">
              <defs>
                <linearGradient id="barRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#2563eb" /></linearGradient>
                <linearGradient id="barExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb7185" /><stop offset="100%" stopColor="#e11d48" /></linearGradient>
                <linearGradient id="barProduct" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#f59e0b" /></linearGradient>
                <linearGradient id="barProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#16a34a" /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 6" stroke="rgba(148,163,184,.14)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={currencyTick} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={46} />
              <Tooltip formatter={(value) => tooltipCurrency(Number(value))} contentStyle={tooltipStyle} cursor={{ fill: "rgba(148,163,184,.05)" }} />
              <Bar dataKey="value" name="Valor" radius={[10, 10, 3, 3]} maxBarSize={78}>
                {financialResult.map((entry) => <Cell key={entry.name} fill={`url(#${entry.name === "Faturamento" ? "barRevenue" : entry.name === "Despesas" ? "barExpense" : entry.name === "Produtos" ? "barProduct" : "barProfit"})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 border-t border-border/50 pt-4 sm:grid-cols-4">
            {financialResult.map((item) => (
              <div key={item.name} className="rounded-xl bg-background/35 px-3 py-2.5">
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} /><span className="text-xs text-muted-foreground">{item.name}</span></div>
                <p className="mt-1 text-sm font-bold">{brl(item.value)}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({ children, title, description, icon, iconClass, accent, badge, badgeClass = "text-cyan-400 bg-cyan-500/10", className = "" }: { children: React.ReactNode; title: string; description: string; icon: string; iconClass: string; accent: string; badge?: string; badgeClass?: string; className?: string }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-xl hover:shadow-black/20 sm:p-5 ${className}`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-80`} />
      <div className="relative">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${iconClass} text-base font-bold`}>{icon}</span>
            <div className="min-w-0"><h3 className="text-base font-bold tracking-tight">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
          </div>
          {badge && <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${badgeClass}`}>{badge}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}
