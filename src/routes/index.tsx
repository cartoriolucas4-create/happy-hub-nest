import { createFileRoute } from "@tanstack/react-router";
import heroImg from "@/assets/hero-barbearia.jpg";
import { Servicos, Sobre, Equipe, Depoimentos, Contato } from "@/components/barbearia/Sections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Navalha de Ouro | Barbearia Clássica em São Paulo" },
      {
        name: "description",
        content:
          "Barbearia clássica no centro de São Paulo: corte na tesoura, barba com toalha quente e navalha. Agende seu horário pelo WhatsApp.",
      },
      { property: "og:title", content: "Navalha de Ouro | Barbearia Clássica em São Paulo" },
      {
        property: "og:description",
        content:
          "Corte, barba e navalha tradicional em ambiente sem pressa. Horário reservado só para você.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const nav = [
  { href: "#servicos", label: "Serviços" },
  { href: "#sobre", label: "A casa" },
  { href: "#equipe", label: "Equipe" },
  { href: "#contato", label: "Contato" },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#top" className="font-display text-2xl tracking-[0.2em]">
            NAVALHA<span className="text-primary">.</span>OURO
          </a>
          <nav className="hidden gap-8 text-xs uppercase tracking-[0.2em] md:flex">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="text-muted-foreground hover:text-primary">
                {n.label}
              </a>
            ))}
          </nav>
          <a
            href="https://wa.me/551133334444"
            className="rounded-sm border border-primary px-5 py-2 font-display text-sm tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            AGENDAR
          </a>
        </div>
      </header>

      <main id="top">
        <section className="relative isolate">
          <img
            src={heroImg}
            alt="Interior de barbearia clássica iluminada por luz âmbar"
            width={1600}
            height={1008}
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/85 to-background/30" />
          <div className="mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-center px-6 py-28">
            <p className="font-display text-sm tracking-[0.4em] text-primary">
              SÃO PAULO · DESDE 2009
            </p>
            <h1 className="mt-6 max-w-3xl text-5xl leading-[0.95] sm:text-7xl md:text-8xl">
              Corte de homem<br />feito à navalha
            </h1>
            <p className="mt-8 max-w-xl text-lg text-muted-foreground">
              Toalha quente, tesoura afiada e tempo de sobra. Uma cadeira por vez, do jeito que
              barbearia sempre foi.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#contato"
                className="rounded-sm bg-primary px-8 py-4 font-display text-lg tracking-widest text-primary-foreground transition-colors hover:bg-primary/90"
              >
                RESERVAR CADEIRA
              </a>
              <a
                href="#servicos"
                className="rounded-sm border border-border px-8 py-4 font-display text-lg tracking-widest transition-colors hover:border-primary hover:text-primary"
              >
                VER PREÇOS
              </a>
            </div>
          </div>
        </section>

        <Servicos />
        <Sobre />
        <Equipe />
        <Depoimentos />
        <Contato />
      </main>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-xs uppercase tracking-[0.2em] text-muted-foreground sm:flex-row">
          <span className="font-display text-base tracking-[0.2em] text-foreground">
            NAVALHA<span className="text-primary">.</span>OURO
          </span>
          <span>© {new Date().getFullYear()} — Todos os direitos reservados</span>
        </div>
      </footer>
    </div>
  );
}
