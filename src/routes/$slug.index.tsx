import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
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
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/media";
import { fetchGaleria, GALERIA_PADRAO } from "@/lib/gallery";
import { accentStyle } from "@/lib/theme";
import { WhatsAppFloat } from "@/components/public/WhatsAppFloat";
import { Reveal } from "@/components/public/Reveal";

import heroPadrao from "@/assets/lux-hero.jpg";
import artePadrao from "@/assets/lux-arte.jpg";
import experienciaPadrao from "@/assets/lux-experiencia.jpg";

export const Route = createFileRoute("/$slug/")({
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
  const pageColor = shop.cor_secundaria?.trim() || "#1b1714";
  const pageStyle = {
    "--background": pageColor,
    ...accentStyle(shop.cor_primaria),
  } as CSSProperties;

  const cta = (rotulo: string, className: string) => (
    <Link to="/$slug/agendar" params={{ slug }} className={className}>
      {rotulo}
    </Link>
  );

  const btnPrimario =
    "group inline-flex items-center justify-center gap-2 border border-primary bg-primary px-9 py-4 text-[0.72rem] uppercase tracking-[0.32em] text-primary-foreground transition-all hover:bg-transparent hover:text-primary";
  const btnSecundario =
    "inline-flex items-center justify-center gap-2 border border-border px-9 py-4 text-[0.72rem] uppercase tracking-[0.32em] text-foreground/80 transition-all hover:border-primary hover:text-primary";

  return (
    <div className="min-h-screen bg-background text-foreground" style={pageStyle}>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl",
          logo ? "py-3 sm:py-4 lg:py-5" : "py-3",
        )}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 lg:px-10">
          <div className="flex items-center gap-3">
            {logo ? (
              <img
                src={logo}
                alt={`Logo da ${shop.nome}`}
                className="h-[52px] w-[52px] -my-2 rounded-full border border-primary/30 object-cover sm:h-[60px] sm:w-[60px] sm:-my-3 lg:h-[68px] lg:w-[68px] lg:-my-3"
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