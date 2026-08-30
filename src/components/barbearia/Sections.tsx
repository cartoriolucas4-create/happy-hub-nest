import { Scissors, Clock, MapPin, Phone, Instagram, Star } from "lucide-react";
import barbaImg from "@/assets/barba.jpg";
import ferramentasImg from "@/assets/ferramentas.jpg";

const servicos = [
  { nome: "Corte Clássico", preco: "R$ 55", tempo: "40 min", desc: "Tesoura, máquina e acabamento na navalha." },
  { nome: "Barba Terapia", preco: "R$ 45", tempo: "30 min", desc: "Toalha quente, óleos e navalha tradicional." },
  { nome: "Combo Navalhado", preco: "R$ 89", tempo: "1h10", desc: "Corte completo + barba desenhada." },
  { nome: "Pezinho & Ajuste", preco: "R$ 25", tempo: "15 min", desc: "Manutenção rápida entre visitas." },
  { nome: "Camuflagem de Grisalhos", preco: "R$ 70", tempo: "45 min", desc: "Tonalização natural e discreta." },
  { nome: "Corte Infantil", preco: "R$ 40", tempo: "30 min", desc: "Paciência, cadeira alta e paçoca no final." },
];

const equipe = [
  { nome: "Téo Almeida", papel: "Master Barber · 12 anos", especialidade: "Fades e navalha livre" },
  { nome: "Rui Santana", papel: "Barbeiro · 8 anos", especialidade: "Barbas desenhadas" },
  { nome: "Caio Peçanha", papel: "Barbeiro · 5 anos", especialidade: "Cortes clássicos" },
];

const depoimentos = [
  { texto: "Melhor navalhada da cidade. Saio de lá parecendo outra pessoa.", autor: "Marcelo T." },
  { texto: "Atendimento no horário, café bom e corte impecável. Virei cliente fixo.", autor: "Diego R." },
  { texto: "Levo meu filho junto. Os dois saem felizes, isso não tem preço.", autor: "André L." },
];

export function Servicos() {
  return (
    <section id="servicos" className="border-t border-border bg-background py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="font-display text-sm tracking-[0.35em] text-primary">TABELA</p>
            <h2 className="mt-2 text-4xl md:text-5xl">Serviços & Preços</h2>
          </div>
          <Scissors className="hidden h-10 w-10 text-primary/40 md:block" aria-hidden="true" />
        </div>

        <ul className="mt-12 grid gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-2 lg:grid-cols-3">
          {servicos.map((s) => (
            <li key={s.nome} className="group bg-card p-7 transition-colors hover:bg-secondary">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-2xl">{s.nome}</h3>
                <span className="font-display text-2xl text-primary">{s.preco}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{s.desc}</p>
              <p className="mt-4 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {s.tempo}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Sobre() {
  return (
    <section id="sobre" className="border-t border-border bg-card/40 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-4">
          <img
            src={barbaImg}
            alt="Barbeiro finalizando a barba de um cliente com navalha"
            loading="lazy"
            width={900}
            height={1100}
            className="h-full w-full rounded-sm object-cover"
          />
          <img
            src={ferramentasImg}
            alt="Ferramentas de barbeiro sobre bancada de madeira"
            loading="lazy"
            width={900}
            height={1100}
            className="mt-10 h-full w-full rounded-sm object-cover"
          />
        </div>
        <div>
          <p className="font-display text-sm tracking-[0.35em] text-primary">DESDE 2009</p>
          <h2 className="mt-2 text-4xl md:text-5xl">Ofício de barbeiro, sem pressa</h2>
          <p className="mt-6 text-muted-foreground">
            A Navalha de Ouro nasceu num sobrado antigo do centro, com três cadeiras de couro e
            uma regra simples: ninguém sai da cadeira antes de estar satisfeito. Trabalhamos com
            toalha quente, navalha tradicional e produtos que respeitam a pele.
          </p>
          <p className="mt-4 text-muted-foreground">
            Aqui você não pega fila: cada horário é reservado para um único cliente. Café passado
            na hora incluso.
          </p>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-8">
            {[
              ["17", "anos de ofício"],
              ["40k", "cortes feitos"],
              ["4.9", "nota dos clientes"],
            ].map(([n, l]) => (
              <div key={l}>
                <dt className="font-display text-4xl text-primary">{n}</dt>
                <dd className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function Equipe() {
  return (
    <section id="equipe" className="border-t border-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <p className="font-display text-sm tracking-[0.35em] text-primary">CADEIRAS</p>
        <h2 className="mt-2 text-4xl md:text-5xl">Quem vai te atender</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {equipe.map((m, i) => (
            <article key={m.nome} className="rounded-sm border border-border bg-card p-8">
              <span className="font-display text-5xl text-primary/30">0{i + 1}</span>
              <h3 className="mt-4 text-2xl">{m.nome}</h3>
              <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{m.papel}</p>
              <p className="mt-4 text-sm text-muted-foreground">{m.especialidade}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Depoimentos() {
  return (
    <section className="border-t border-border bg-card/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-4xl md:text-5xl">Na palavra de quem senta na cadeira</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {depoimentos.map((d) => (
            <figure key={d.autor} className="rounded-sm border border-border bg-background p-8">
              <div className="flex gap-1 text-primary" aria-label="5 de 5 estrelas">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" aria-hidden="true" />
                ))}
              </div>
              <blockquote className="mt-5 text-lg leading-relaxed">“{d.texto}”</blockquote>
              <figcaption className="mt-5 text-xs uppercase tracking-widest text-muted-foreground">
                {d.autor}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Contato() {
  return (
    <section id="contato" className="border-t border-border py-24">
      <div className="mx-auto grid max-w-6xl gap-14 px-6 lg:grid-cols-2">
        <div>
          <p className="font-display text-sm tracking-[0.35em] text-primary">VISITE</p>
          <h2 className="mt-2 text-4xl md:text-5xl">Agende seu horário</h2>
          <p className="mt-6 text-muted-foreground">
            Reservas por WhatsApp ou telefone. Encaixes no mesmo dia conforme disponibilidade.
          </p>
          <ul className="mt-8 space-y-5 text-sm">
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>Rua Almirante Barroso, 218 — Centro, São Paulo</span>
            </li>
            <li className="flex items-start gap-3">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <a href="tel:+551133334444" className="hover:text-primary">(11) 3333-4444</a>
            </li>
            <li className="flex items-start gap-3">
              <Instagram className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>@navalhadeouro</span>
            </li>
          </ul>
          <a
            href="https://wa.me/551133334444"
            className="mt-10 inline-flex items-center justify-center rounded-sm bg-primary px-8 py-4 font-display text-lg tracking-widest text-primary-foreground transition-colors hover:bg-primary/90"
          >
            AGENDAR NO WHATSAPP
          </a>
        </div>

        <div className="rounded-sm border border-border bg-card p-8">
          <h3 className="text-2xl">Horários</h3>
          <ul className="mt-6 divide-y divide-border text-sm">
            {[
              ["Terça a Quinta", "09h — 20h"],
              ["Sexta", "09h — 22h"],
              ["Sábado", "08h — 19h"],
              ["Domingo e Segunda", "Fechado"],
            ].map(([d, h]) => (
              <li key={d} className="flex justify-between py-3">
                <span className="text-muted-foreground">{d}</span>
                <span className="font-display tracking-wider">{h}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-muted-foreground">
            Tolerância de 10 minutos de atraso; após isso o horário pode ser remanejado.
          </p>
        </div>
      </div>
    </section>
  );
}
