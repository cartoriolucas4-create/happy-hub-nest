import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  Phone,
  Instagram,
  Facebook,
  Clock,
  CalendarPlus,
  Navigation,
  Globe,
  Scissors,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  brl,
  DIAS,
  hhmm,
  enderecoLinha1,
  enderecoLinha2,
  mapsLink,
} from "@/lib/barber";
import { mediaUrl } from "@/lib/media";
import { WhatsAppFloat } from "@/components/public/WhatsAppFloat";

export const Route = createFileRoute("/barbearia/$slug/")({
  head: ({ params }) => ({
    meta: [
      { title: `Agendar horário | ${params.slug}` },
      {
        name: "description",
        content:
          "Veja serviços, preços e profissionais e agende seu horário online em poucos cliques.",
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
        <h1 className="text-3xl">{texto}</h1>
        <Link to="/" className="mt-6 inline-block text-primary underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function PaginaPublica() {
  const { slug } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-shop", slug],
    queryFn: async () => {
      const shop = await supabase.from("barbershops").select("*").eq("slug", slug).maybeSingle();
      if (shop.error) throw shop.error;
      if (!shop.data) return null;
      const [services, barbers, hours, logo, cover] = await Promise.all([
        supabase.from("services").select("*").eq("barbershop_id", shop.data.id).eq("ativo", true).order("preco"),
        supabase.from("barbers").select("*").eq("barbershop_id", shop.data.id).eq("ativo", true).order("nome"),
        supabase.from("business_hours").select("*").eq("barbershop_id", shop.data.id).order("dia_semana"),
        mediaUrl(shop.data.logo_url),
        mediaUrl(shop.data.cover_url),
      ]);
      return {
        shop: shop.data,
        services: services.data ?? [],
        barbers: barbers.data ?? [],
        hours: hours.data ?? [],
        logo,
        cover,
      };
    },
  });

  if (isLoading) return <Aviso texto="Carregando..." />;
  if (error) return <Aviso texto="Não foi possível carregar esta barbearia." />;
  if (!data) return <Aviso texto="Barbearia não encontrada." />;

  const { shop, services, barbers, hours, logo, cover } = data;
  const linha1 = enderecoLinha1(shop);
  const linha2 = enderecoLinha2(shop);
  const maps = mapsLink(shop);

  const agendarBtn = (
    <Link
      to="/barbearia/$slug/agendar"
      params={{ slug }}
      className="inline-flex items-center gap-2 rounded-sm bg-primary px-8 py-4 font-display text-lg tracking-widest text-primary-foreground hover:bg-primary/90"
    >
      <CalendarPlus className="h-5 w-5" aria-hidden="true" /> AGENDAR HORÁRIO
    </Link>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HEADER com logo e nome dinâmicos */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            {logo ? (
              <img
                src={logo}
                alt={`Logo da ${shop.nome}`}
                className="h-10 w-10 rounded-full border border-primary/40 object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-secondary text-primary">
                <Scissors className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <span className="font-display text-lg tracking-wide">{shop.nome}</span>
          </div>
          <Link
            to="/barbearia/$slug/agendar"
            params={{ slug }}
            className="rounded-sm bg-primary px-4 py-2 font-display text-sm tracking-widest text-primary-foreground hover:bg-primary/90"
          >
            AGENDAR
          </Link>
        </div>
      </div>

      {/* HERO com capa dinâmica */}
      <header className="relative isolate border-b border-border">
        {cover ? (
          <>
            <img src={cover} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-background/80" />
          </>
        ) : (
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/60 to-background" />
        )}
        <div className="mx-auto max-w-4xl px-5 py-20 text-center">
          <h1 className="text-4xl md:text-6xl">{shop.nome}</h1>
          {shop.descricao && <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{shop.descricao}</p>}
          <div className="mt-8">{agendarBtn}</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-16 px-5 py-16">
        {/* SERVIÇOS */}
        <section id="servicos">
          <h2 className="text-3xl">Serviços</h2>
          {services.length === 0 ? (
            <p className="mt-4 text-muted-foreground">Serviços em breve.</p>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {services.map((s) => (
                <div key={s.id} className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-xl">{s.nome}</h3>
                    <span className="font-display text-xl text-primary">{brl(s.preco)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{s.duracao_minutos} minutos</p>
                  {s.descricao && <p className="mt-2 text-sm text-muted-foreground">{s.descricao}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* BARBEIROS */}
        {barbers.length > 0 && (
          <section id="profissionais">
            <h2 className="text-3xl">Profissionais</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {barbers.map((b) => (
                <div key={b.id} className="rounded-lg border border-border bg-card p-5 text-center">
                  {b.foto_url ? (
                    <img src={b.foto_url} alt={b.nome} className="mx-auto h-20 w-20 rounded-full object-cover" />
                  ) : (
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary font-display text-2xl text-primary">
                      {b.nome.slice(0, 1)}
                    </div>
                  )}
                  <h3 className="mt-3 text-lg">{b.nome}</h3>
                  {b.descricao && <p className="text-sm text-muted-foreground">{b.descricao}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SOBRE */}
        {shop.descricao && (
          <section id="sobre">
            <h2 className="text-3xl">Sobre</h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">{shop.descricao}</p>
          </section>
        )}

        <section className="grid gap-10 sm:grid-cols-2">
          {/* HORÁRIOS */}
          <div id="horarios">
            <h2 className="flex items-center gap-2 text-3xl">
              <Clock className="h-6 w-6 text-primary" aria-hidden="true" /> Horários
            </h2>
            <ul className="mt-5 space-y-1 text-sm text-muted-foreground">
              {DIAS.map((d, i) => {
                const h = hours.find((x) => x.dia_semana === i);
                return (
                  <li key={d} className="flex justify-between border-b border-border/60 py-1.5">
                    <span>{d}</span>
                    <span>{h?.aberto ? `${hhmm(h.hora_inicio)} – ${hhmm(h.hora_fim)}` : "Fechado"}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* LOCALIZAÇÃO E CONTATO */}
          <div id="localizacao">
            <h2 className="text-3xl">Localização e contato</h2>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              {linha1 && (
                <li className="flex gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    {linha1}
                    {linha2 && <span className="block">{linha2}</span>}
                  </span>
                </li>
              )}
              {shop.telefone && (
                <li className="flex gap-2">
                  <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
                  {shop.telefone}
                </li>
              )}
              {shop.instagram && (
                <li className="flex gap-2">
                  <Instagram className="h-4 w-4 text-primary" aria-hidden="true" />
                  {shop.instagram}
                </li>
              )}
              {shop.facebook && (
                <li className="flex gap-2">
                  <Facebook className="h-4 w-4 text-primary" aria-hidden="true" />
                  {shop.facebook}
                </li>
              )}
              {shop.site_url && (
                <li className="flex gap-2">
                  <Globe className="h-4 w-4 text-primary" aria-hidden="true" />
                  {shop.site_url}
                </li>
              )}
            </ul>
            {maps && (
              <a
                href={maps}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-sm border border-border px-5 py-3 text-sm hover:border-primary hover:text-primary"
              >
                <Navigation className="h-4 w-4" aria-hidden="true" /> Como chegar
              </a>
            )}
          </div>
        </section>

        {/* AGENDAMENTO */}
        <section id="agendamento" className="rounded-lg border border-border bg-card p-8 text-center">
          <h2 className="text-3xl">Pronto para agendar?</h2>
          <p className="mt-2 text-muted-foreground">
            Escolha serviço, profissional, data e horário em poucos cliques.
          </p>
          <div className="mt-6">{agendarBtn}</div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {shop.nome} · agendamento online por BarberFlow
      </footer>

      <WhatsAppFloat shop={shop} />
    </div>
  );
}
