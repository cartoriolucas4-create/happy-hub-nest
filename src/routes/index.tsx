import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarClock,
  Clock,
  Users,
  Scissors,
  Sparkles,
  LayoutDashboard,
  Link2,
  UserCog,
  ArrowRight,
} from "lucide-react";
import heroImg from "@/assets/hero-barbearia.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BarberFlow | Sistema de agendamento para barbearias" },
      {
        name: "description",
        content:
          "Plataforma completa para barbearias gerenciarem agenda, barbeiros, serviços e clientes, com link exclusivo de agendamento online 24h.",
      },
      { property: "og:title", content: "BarberFlow | Agendamento online para barbearias" },
      {
        property: "og:description",
        content:
          "Crie sua barbearia, configure serviços e horários e receba agendamentos pelo seu link exclusivo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const beneficios = [
  { icon: CalendarClock, t: "Agenda online", d: "Visualize o dia, a semana e cada barbeiro." },
  { icon: Clock, t: "Agendamento 24 horas", d: "Seus clientes marcam a qualquer hora." },
  { icon: Users, t: "Gestão de clientes", d: "Histórico completo de cada cliente." },
  { icon: UserCog, t: "Gestão de barbeiros", d: "Jornada individual por profissional." },
  { icon: Scissors, t: "Cadastro de serviços", d: "Preço e duração usados no agendamento." },
  { icon: Clock, t: "Controle de horários", d: "Funcionamento, intervalos e bloqueios." },
  { icon: LayoutDashboard, t: "Painel administrativo", d: "Indicadores e faturamento do dia." },
  { icon: Link2, t: "Link exclusivo", d: "Divulgue no Instagram, WhatsApp e QR Code." },
];

const passos = [
  "Cadastre sua barbearia.",
  "Configure seus serviços e horários.",
  "Compartilhe seu link.",
  "Receba agendamentos.",
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <span className="font-display text-xl tracking-[0.2em] sm:text-2xl">
            BARBER<span className="text-primary">FLOW</span>
          </span>
          <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              to="/login"
              className="rounded-sm px-2 py-2 text-xs tracking-widest text-muted-foreground transition-colors hover:text-primary sm:px-3 sm:text-sm"
            >
              ENTRAR
            </Link>
            <Link
              to="/cadastro"
              className="rounded-sm px-2 py-2 text-xs tracking-widest text-foreground/90 underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary sm:px-3 sm:text-sm"
            >
              CADASTRE-SE
            </Link>
            <Link
              to="/cadastro"
              className="rounded-sm bg-primary px-3 py-2 font-display text-xs tracking-widest text-primary-foreground transition-colors hover:bg-primary/90 sm:px-5 sm:text-sm"
            >
              COMEÇAR
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative isolate">
          <img
            src={heroImg}
            alt="Barbearia clássica com iluminação âmbar"
            width={1600}
            height={1008}
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/90 to-background/40" />
          <div className="mx-auto max-w-6xl px-5 py-24 md:py-32">
            <p className="font-display text-xs tracking-[0.4em] text-primary">
              PLATAFORMA PARA BARBEARIAS
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl leading-[1] sm:text-6xl md:text-7xl">
              Agende seu corte de forma simples.
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              Uma plataforma completa para barbearias gerenciarem sua agenda e permitirem que seus
              clientes agendem online.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/cadastro"
                className="rounded-sm bg-primary px-7 py-4 font-display text-lg tracking-widest text-primary-foreground hover:bg-primary/90"
              >
                COMEÇAR AGORA
              </Link>
              <Link
                to="/login"
                className="rounded-sm border border-border px-7 py-4 font-display text-lg tracking-widest hover:border-primary hover:text-primary"
              >
                ENTRAR
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-20">
          <div className="mx-auto max-w-6xl px-5">
            <p className="font-display text-xs tracking-[0.35em] text-primary">BENEFÍCIOS</p>
            <h2 className="mt-2 text-3xl md:text-4xl">Tudo que sua barbearia precisa</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {beneficios.map((b) => (
                <div
                  key={b.t}
                  className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40"
                >
                  <b.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-xl">{b.t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{b.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card/40 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <p className="font-display text-xs tracking-[0.35em] text-primary">COMO FUNCIONA</p>
            <h2 className="mt-2 text-3xl md:text-4xl">Em quatro passos</h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-4">
              {passos.map((p, i) => (
                <li key={p} className="rounded-lg border border-border bg-background p-6">
                  <span className="font-display text-4xl text-primary/40">0{i + 1}</span>
                  <p className="mt-3 text-sm">{p}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border py-24">
          <div className="mx-auto max-w-3xl px-5 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-3xl md:text-5xl">Crie sua barbearia agora</h2>
            <p className="mt-4 text-muted-foreground">
              Configure em minutos e comece a receber agendamentos pelo seu link exclusivo.
            </p>
            <Link
              to="/cadastro"
              className="mt-9 inline-flex items-center gap-2 rounded-sm bg-primary px-8 py-4 font-display text-lg tracking-widest text-primary-foreground hover:bg-primary/90"
            >
              CRIAR MINHA BARBEARIA <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-5 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          © {new Date().getFullYear()} BarberFlow
        </div>
      </footer>
    </div>
  );
}
