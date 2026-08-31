import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  Phone,
  Instagram,
  Facebook,
  Clock,
  Navigation,
  Globe,
  Scissors,
  MessageCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  brl,
  DIAS,
  hhmm,
  enderecoLinha1,
  enderecoLinha2,
  mapsLink,
  waLink,
} from "@/lib/barber";
import { mediaUrl } from "@/lib/media";
import { fetchGaleria, GALERIA_PADRAO } from "@/lib/gallery";
import { WhatsAppFloat } from "@/components/public/WhatsAppFloat";
import { Reveal } from "@/components/public/Reveal";

import heroPadrao from "@/assets/lux-hero.jpg";
import artePadrao from "@/assets/lux-arte.jpg";
import experienciaPadrao from "@/assets/lux-experiencia.jpg";

export const Route = createFileRoute("/barbearia/$slug/")({
  head: ({ params }) => ({
    meta: [
      { title: `Agendar horário | ${params.slug}` },
      {
        name: "description",
        content:
          "Barbearia premium: veja serviços, preços, profissionais e agende seu horário online em poucos cliques.",
      },
      { property: "og:title", content: `Agendar horário online | ${params.slug}` },
      {
        property: "og:description",
        content: "Escolha o serviço, o barbeiro e o horário. Agendamento online 24h.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => <Aviso texto="Não foi possível carregar esta barbearia." />,
  notFoundComponent: () => <Aviso texto="Barbearia não encontrada." />,
  component: PaginaPublica,
});

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
      <div>
        <h1 className="font-serif-display text-3xl">{texto}</h1>
        <Link to="/" className="mt-6 inline-block text-primary underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

const eyebrow = "text-[0.7rem] uppercase tracking-[0.42em] text-primary";
const titulo = "font-serif-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl";

function Regua() {
  return <span className="mt-6 block h-px w-16 bg-gradient-to-r from-primary to-transparent" />;
}

function PaginaPublica() {
  const { slug } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-shop", slug],
    queryFn: async () => {
      const shop = await supabase.from("barbershops").select("*").eq("slug", slug).maybeSingle();
      if (shop.error) throw shop.error;
      if (!shop.data) return null;
      const [services, barbers, hours, logo, cover, galeria] = await Promise.all([
        supabase
          .from("services")
          .select("*")
          .eq("barbershop_id", shop.data.id)
          .eq("ativo", true)
          .order("preco"),
        supabase
          .from("barbers")
          .select("*")
          .eq("barbershop_id", shop.data.id)
          .eq("ativo", true)
          .order("nome"),
        supabase
          .from("business_hours")
          .select("*")
          .eq("barbershop_id", shop.data.id)
          .order("dia_semana"),
        mediaUrl(shop.data.logo_url),
        mediaUrl(shop.data.cover_url),
        fetchGaleria(shop.data.id),
      ]);
      return {
        shop: shop.data,
        services: services.data ?? [],
        barbers: barbers.data ?? [],
        hours: hours.data ?? [],
        logo,
        cover,
        galeria,
      };
    },
  });

  if (isLoading) return <Aviso texto="Carregando..." />;
  if (error) return <Aviso texto="Não foi possível carregar esta barbearia." />;
  if (!data) return <Aviso texto="Barbearia não encontrada." />;

  const { shop, services, barbers, hours, logo, cover, galeria } = data;
  const linha1 = enderecoLinha1(shop);
  const linha2 = enderecoLinha2(shop);
  const maps = mapsLink(shop);
  const wa = waLink(shop);
  const heroImg = cover ?? heroPadrao;
  const fotos = galeria.length > 0 ? galeria : GALERIA_PADRAO;
  const slogan = shop.slogan?.trim() || "Precisão em cada detalhe.";
  const sobre =
    shop.descricao?.trim() ||
    "Uma barbearia feita para quem valoriza o cuidado com a própria imagem: técnica apurada, produtos selecionados e um atendimento pensado nos mínimos detalhes.";
  const experiencia =
    shop.sobre_experiencia?.trim() || "Precisão, estilo e cuidado em cada atendimento.";
  const enderecoCompleto = [linha1, linha2].filter(Boolean).join(", ");
  const mapaUrl = enderecoCompleto
    ? `https://www.google.com/maps?q=${encodeURIComponent(enderecoCompleto)}&output=embed`
    : null;

  const cta = (rotulo: string, className: string) => (
    <Link to="/barbearia/$slug/agendar" params={{ slug }} className={className}>
      {rotulo}
    </Link>
  );

  const btnPrimario =
    "group inline-flex items-center justify-center gap-2 border border-primary bg-primary px-9 py-4 text-[0.72rem] uppercase tracking-[0.32em] text-primary-foreground transition-all hover:bg-transparent hover:text-primary";
  const btnSecundario =
    "inline-flex items-center justify-center gap-2 border border-border px-9 py-4 text-[0.72rem] uppercase tracking-[0.32em] text-foreground/80 transition-all hover:border-primary hover:text-primary";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-3 lg:px-10">
          <div className="flex items-center gap-3">
            {logo ? (
              <img
                src={logo}
                alt={`Logo da ${shop.nome}`}
                className="h-11 w-11 rounded-full border border-primary/30 object-cover"
              />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-card text-primary">
                <Scissors className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <span className="font-serif-display text-lg tracking-wide sm:text-xl">{shop.nome}</span>
          </div>
          <nav className="hidden items-center gap-8 text-[0.68rem] uppercase tracking-[0.3em] text-muted-foreground lg:flex">
            <a href="#servicos" className="hover:text-primary">Serviços</a>
            <a href="#equipe" className="hover:text-primary">Equipe</a>
            <a href="#trabalho" className="hover:text-primary">Trabalho</a>
            <a href="#horarios" className="hover:text-primary">Horários</a>
            <a href="#local" className="hover:text-primary">Local</a>
          </nav>
          {cta(
            "Agendar",
            "hidden border border-primary px-6 py-3 text-[0.68rem] uppercase tracking-[0.3em] text-primary transition hover:bg-primary hover:text-primary-foreground sm:inline-flex",
          )}
        </div>
      </header>

      <section className="relative isolate flex min-h-[92svh] items-end overflow-hidden">
        <img src={heroImg} alt="" width={1920} height={1280} className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/80 to-background/40" />
        <div className="absolute inset-0 -z-10 bg-noise opacity-[0.06] mix-blend-soft-light" />
        <div className="mx-auto w-full max-w-[1600px] px-5 pb-14 pt-32 lg:px-10 lg:pb-20">
          <div className="max-w-3xl lux-rise">
            <span className={eyebrow}>Barbearia · Agendamento online</span>
            <h1 className="mt-6 font-serif-display text-5xl leading-[0.98] sm:text-7xl lg:text-8xl">{shop.nome}</h1>
            <p className="mt-5 max-w-xl font-serif-display text-xl text-muted-foreground sm:text-2xl">“{slogan}”</p>
            <div className="mt-10 flex flex-wrap gap-3">
              {cta("Agendar horário", btnPrimario)}
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={btnSecundario}><MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp</a>}
            </div>
          </div>
          <dl className="mt-14 grid max-w-3xl grid-cols-3 divide-x divide-border border-y border-border">
            {[["Serviços", String(services.length)], ["Profissionais", String(barbers.length)], ["Agendamento online", "24h"]].map(([rotulo, valor]) => (
              <div key={rotulo} className="px-4 py-5 text-center sm:px-6">
                <dd className="font-serif-display text-2xl text-primary sm:text-3xl">{valor}</dd>
                <dt className="mt-1 text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">{rotulo}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-border/60 py-24 lg:py-32">
        <div className="mx-auto grid max-w-[1600px] items-center gap-12 px-5 lg:grid-cols-2 lg:gap-20 lg:px-10">
          <Reveal className="order-2 lg:order-1">
            <span className={eyebrow}>A arte do corte</span>
            <h2 className={`mt-5 ${titulo}`}>O detalhe faz toda a diferença.</h2>
            <Regua />
            <p className="mt-8 max-w-xl text-[0.98rem] leading-relaxed text-muted-foreground">{sobre}</p>
            <div className="mt-10">{cta("Agendar horário", btnPrimario)}</div>
          </Reveal>
          <Reveal delay={120} className="order-1 lg:order-2">
            <div className="group relative overflow-hidden"><img src={artePadrao} alt="Acabamento de barba com navalha" loading="lazy" width={1280} height={1600} className="h-[380px] w-full object-cover transition-transform duration-[1400ms] group-hover:scale-105 sm:h-[520px] lg:h-[680px]" /><div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" /></div>
          </Reveal>
        </div>
      </section>

      <section id="servicos" className="border-t border-border/60 py-24 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-5 lg:px-10">
          <Reveal><span className={eyebrow}>Serviços</span><h2 className={`mt-5 ${titulo}`}>Escolha a sua experiência</h2><Regua /></Reveal>
          {services.length === 0 ? <p className="mt-10 text-muted-foreground">Serviços em breve.</p> : <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {services.map((s, i) => <Reveal key={s.id} delay={i * 70}><article className="group relative flex h-full flex-col justify-between overflow-hidden border border-border bg-card p-8 transition-colors hover:border-primary/40"><span className="absolute inset-x-0 top-0 h-px w-0 bg-primary transition-all duration-700 group-hover:w-full" /><div><div className="flex items-start justify-between gap-4"><h3 className="font-serif-display text-2xl leading-tight">{s.nome}</h3><Sparkles className="h-4 w-4 shrink-0 text-primary/60" aria-hidden="true" /></div>{s.descricao && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{s.descricao}</p>}</div><div className="mt-8"><div className="flex items-end justify-between border-t border-border pt-5"><span className="text-[0.62rem] uppercase tracking-[0.3em] text-muted-foreground">{s.duracao_minutos} min</span><span className="font-serif-display text-3xl text-primary">{brl(s.preco)}</span></div>{cta("Agendar", "mt-6 flex w-full items-center justify-center gap-2 border border-border py-3.5 text-[0.68rem] uppercase tracking-[0.3em] transition hover:border-primary hover:bg-primary hover:text-primary-foreground")}</div></article></Reveal>)}
          </div>}
        </div>
      </section>

      {barbers.length > 0 && <section id="equipe" className="border-t border-border/60 py-24 lg:py-32"><div className="mx-auto max-w-[1600px] px-5 lg:px-10"><Reveal><span className={eyebrow}>Nossa equipe</span><h2 className={`mt-5 ${titulo}`}>Mestres da navalha</h2><Regua /></Reveal><div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{barbers.map((b, i) => <Reveal key={b.id} delay={i * 70}><article className="group overflow-hidden border border-border bg-card"><div className="relative h-72 overflow-hidden sm:h-80"><img src={b.foto_url || GALERIA_PADRAO[i % GALERIA_PADRAO.length]!.url} alt={b.nome} loading="lazy" className="h-full w-full object-cover grayscale-[35%] transition-all duration-[1200ms] group-hover:scale-105 group-hover:grayscale-0" /><div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" /></div><div className="p-7"><h3 className="font-serif-display text-2xl">{b.nome}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.descricao?.trim() || "Especialista em cortes, fade e barba."}</p>{cta("Agendar", "mt-6 inline-flex items-center gap-2 border-b border-primary/50 pb-1 text-[0.68rem] uppercase tracking-[0.3em] text-primary transition hover:border-primary")}</div></article></Reveal>)}</div></div></section>}

      <section id="trabalho" className="border-t border-border/60 py-24 lg:py-32"><div className="mx-auto max-w-[1600px] px-5 lg:px-10"><Reveal><span className={eyebrow}>Nosso trabalho</span><h2 className={`mt-5 ${titulo}`}>Cada corte, uma assinatura</h2><Regua /></Reveal><div className="mt-14 grid auto-rows-[190px] grid-cols-2 gap-3 sm:auto-rows-[240px] lg:grid-cols-4 lg:gap-4">{fotos.slice(0, 8).map((f, i) => { const span = i % 5 === 0 ? "col-span-2 row-span-2" : i % 5 === 3 ? "col-span-2" : i % 5 === 4 ? "row-span-2" : ""; return <Reveal key={f.id} delay={i * 60} className={span}><figure className="group relative h-full w-full overflow-hidden"><img src={f.url} alt={f.descricao ?? `Trabalho da ${shop.nome}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-110" /><div className="absolute inset-0 bg-gradient-to-t from-background/85 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />{f.descricao && <figcaption className="absolute bottom-0 left-0 p-5 text-[0.62rem] uppercase tracking-[0.28em] text-foreground opacity-0 transition-opacity duration-500 group-hover:opacity-100">{f.descricao}</figcaption>}</figure></Reveal>; })}</div></div></section>

      <section className="relative isolate overflow-hidden border-t border-border/60"><img src={experienciaPadrao} alt="" loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover" /><div className="absolute inset-0 -z-10 bg-background/80" /><div className="mx-auto max-w-[1600px] px-5 py-28 lg:px-10 lg:py-40"><Reveal className="ml-auto max-w-xl"><span className={eyebrow}>A experiência</span><h2 className={`mt-5 ${titulo}`}>Mais que um corte.</h2><Regua /><p className="mt-8 font-serif-display text-2xl leading-snug text-foreground/90">{experiencia}</p><div className="mt-10">{cta("Agendar horário", btnPrimario)}</div></Reveal></div></section>

      <section className="border-t border-border/60 py-24 lg:py-32">
        <div className="mx-auto grid max-w-[1600px] gap-16 px-5 lg:grid-cols-2 lg:gap-24 lg:px-10">
          <Reveal id="horarios"><span className={eyebrow}>Horário de funcionamento</span><h2 className={`mt-5 ${titulo}`}>Quando estamos abertos</h2><Regua /><ul className="mt-10">{DIAS.map((d, i) => { const h = hours.find((x) => x.dia_semana === i); const aberto = Boolean(h?.aberto); return <li key={d} className="flex items-baseline justify-between gap-6 border-b border-border/70 py-4"><span className="text-[0.68rem] uppercase tracking-[0.3em] text-muted-foreground">{d}</span><span className={`font-serif-display text-xl ${aberto ? "text-primary" : "text-muted-foreground/60"}`}>{aberto ? `${hhmm(h!.hora_inicio)} — ${hhmm(h!.hora_fim)}` : "Fechado"}</span></li>; })}</ul></Reveal>
          <Reveal delay={120} id="local">
            <span className={eyebrow}>Encontre a gente</span>
            <h2 className={`mt-5 ${titulo}`}>Localização e contato</h2>
            <Regua />
            <ul className="mt-10 space-y-4 text-sm text-muted-foreground">
              {linha1 && <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span>{linha1}{linha2 && <span className="block">{linha2}</span>}</span></li>}
              {shop.telefone && <li className="flex gap-3"><Phone className="h-4 w-4 text-primary" aria-hidden="true" /> {shop.telefone}</li>}
              {shop.instagram && <li className="flex gap-3"><Instagram className="h-4 w-4 text-primary" aria-hidden="true" /> {shop.instagram}</li>}
              {shop.facebook && <li className="flex gap-3"><Facebook className="h-4 w-4 text-primary" aria-hidden="true" /> {shop.facebook}</li>}
              {shop.site_url && <li className="flex gap-3"><Globe className="h-4 w-4 text-primary" aria-hidden="true" /> {shop.site_url}</li>}
            </ul>
            {mapaUrl ? (
              <div className="mt-8 overflow-hidden border border-border bg-card shadow-sm">
                <iframe
                  title={`Mapa de localização da ${shop.nome}`}
                  src={mapaUrl}
                  className="h-64 w-full sm:h-72"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="mt-8 flex h-48 items-center justify-center border border-border bg-card/60 bg-noise text-[0.62rem] uppercase tracking-[0.3em] text-muted-foreground">Endereço em breve</div>
            )}
            {maps && <a href={maps} target="_blank" rel="noopener noreferrer" className={`mt-6 ${btnSecundario}`}><Navigation className="h-4 w-4" aria-hidden="true" /> Como chegar</a>}
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border/60 py-24 text-center lg:py-32"><Reveal className="mx-auto max-w-3xl px-5"><span className={eyebrow}>Agendamento</span><h2 className={`mt-5 ${titulo}`}>Reserve o seu horário</h2><p className="mt-6 text-muted-foreground">Serviço, profissional, data e hora em poucos cliques — confirmação direto no WhatsApp da{" "}{shop.nome}.</p><div className="mt-10 flex flex-wrap justify-center gap-3">{cta("Agendar horário", btnPrimario)}{wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={btnSecundario}><MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp</a>}</div></Reveal></section>

      <footer className="border-t border-border py-10 text-center text-[0.6rem] uppercase tracking-[0.32em] text-muted-foreground">{shop.nome} · agendamento online por BarberFlow</footer>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/20 bg-background/90 p-3 backdrop-blur-xl sm:inset-x-auto sm:bottom-8 sm:left-8 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"><Link to="/barbearia/$slug/agendar" params={{ slug }} className="flex items-center justify-center gap-2 bg-primary px-8 py-4 text-[0.7rem] uppercase tracking-[0.32em] text-primary-foreground shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition hover:brightness-110 sm:border sm:border-primary">Agendar horário <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link></div>
      <WhatsAppFloat shop={shop} />
      <div className="h-20 sm:h-0" />
    </div>
  );
}
