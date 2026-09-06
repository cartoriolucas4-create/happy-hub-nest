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

const currencyTick = (value: number) =>
  Number(value).toLocaleString("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  });

const tooltipCurrency = (value: number | string) => brl(Number(value));

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
    { name: "Online", value: online },
    { name: "Vendas externas", value: external },
  ].filter((item) => item.value > 0);

  const financialResult = [
    { name: "Faturamento", value: revenue },
    { name: "Despesas", value: expenses },
    { name: "Produtos", value: productCost },
    { name: "Lucro líquido", value: profit },
  ];

  const periodLabel = period === "today" ? "Hoje" : period === "7d" ? "Últimos 7 dias" : period === "30d" ? "Últimos 30 dias" : "Este mês";

  return (
    <section className="mt-8 space-y-4" aria-label="Gráficos do resumo financeiro">
      <div>
        <h2 className="text-2xl">Visão dos resultados</h2>
        <p className="mt-1 text-sm text-muted-foreground">Gráficos interativos do período: {periodLabel}. Passe o mouse sobre os pontos e barras para ver os valores.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Faturamento por dia" description="Recebimentos confirmados e concluídos no período selecionado.">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueByDay} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dashboardRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={12} />
              <YAxis tickFormatter={currencyTick} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(value) => tooltipCurrency(Number(value))} labelFormatter={(label) => `Dia ${label}`} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Area type="monotone" dataKey="revenue" name="Faturamento" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#dashboardRevenueFill)" activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Origem do faturamento" description="Distribuição entre vendas online e vendas externas.">
          <div className="relative h-[280px]">
            {revenueMix.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueMix} dataKey="value" nameKey="name" innerRadius={72} outerRadius={105} paddingAngle={4} strokeWidth={0}>
                    {revenueMix.map((entry, index) => <Cell key={entry.name} fill={index === 0 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.38)"} />)}
                  </Pie>
                  <Tooltip formatter={(value) => tooltipCurrency(Number(value))} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Nenhum faturamento registrado no período.</div>
            )}
            {revenueMix.length > 0 && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="text-center"><p className="text-xs text-muted-foreground">Total</p><p className="mt-1 text-xl font-semibold">{brl(revenue)}</p></div></div>}
          </div>
          {revenueMix.length > 0 && <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">{revenueMix.map((item, index) => <span key={item.name} className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: index === 0 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.38)" }} />{item.name}: {brl(item.value)}</span>)}</div>}
        </ChartCard>

        <ChartCard title="Resultado financeiro" description="Comparação dos principais valores que formam o resultado do período." className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={financialResult} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={currencyTick} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(value) => tooltipCurrency(Number(value))} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Bar dataKey="value" name="Valor" radius={[8, 8, 0, 0]} maxBarSize={64} fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({ children, title, description, className = "" }: { children: React.ReactNode; title: string; description: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm ${className}`}>
      <div className="mb-2 px-1"><h3 className="text-base font-semibold">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
      {children}
    </div>
  );
}

function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}
