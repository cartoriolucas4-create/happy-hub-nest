import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Instagram, Facebook, Clock, CalendarPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl, DIAS, hhmm } from "@/lib/barber";

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
      if (!shop.data) throw notFound();
      const [services, barbers, hours] = await Promise.all([
        supabase.from("services").select("*").eq("barbershop_id", shop.data.id).eq("ativo", true).order("preco"),
        supabase.from("barbers").select("*").eq("barbershop_id", shop.data.id).eq("ativo", true).order("nome"),
        supabase.from("business_hours").select("*").eq("barbershop_id", shop.data.id).order("dia_semana"),
      ]);
      return {
        shop: shop.data,
        services: services.data ?? [],
        barbers: barbers.data ?? [],
        hours: hours.data ?? [],
      };
    },
  });

  if (isLoading) {
    return <Aviso texto="Carregando..." />;
  }
  if (error || !data) {
    return <Aviso texto="Barbearia não encontrada." />;
  }

  const { shop, services, barbers, hours } = data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="relative isolate border-b border-border">
        {shop.cover_url && (
          <>
            <img src={shop.cover_url} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-background/80" />
          </>
        )}
        <div className="mx-auto max-w-4xl px-5 py-16 text-center">
          {shop.logo_url && (
            <img
              src={shop.logo_url}
              alt={`Logo da ${shop.nome}`}
              className="mx-auto mb-6 h-20 w-20 rounded-full border border-primary/40 object-cover"
            />
          )}
          <h1 className="text-4xl md:text-6xl">{shop.nome}</h1>
          {shop.descricao && <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{shop.descricao}</p>}
          <Link
            to="/barbearia/$slug/agendar"
            params={{ slug }}
            className="mt-8 inline-flex items-center gap-2 rounded-sm bg-primary px-8 py-4 font-display text-lg tracking-widest text-primary-foreground hover:bg-primary/90"
          >
            <CalendarPlus className="h-5 w-5" aria-hidden="true" /> AGENDAR AGORA
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-16 px-5 py-16">
        <section>
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

        {barbers.length > 0 && (
          <section>
            <h2 className="text-3xl">Profissionais</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {barbers.map((b) => (
                <div key={b.id} className="rounded-lg border border-border bg-card p-5 text-center">
                  {b.foto_url ? (
                    <img
                      src={b.foto_url}
                      alt={b.nome}
                      className="mx-auto h-20 w-20 rounded-full object-cover"
                    />
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

        <section className="grid gap-8 sm:grid-cols-2">
          <div>
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
          <div>
            <h2 className="text-3xl">Contato</h2>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              {(shop.endereco || shop.cidade) && (
                <li className="flex gap-2">
                  <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                  {[shop.endereco, shop.cidade, shop.estado].filter(Boolean).join(", ")}
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
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {shop.nome} · agendamento online por BarberFlow
      </footer>
    </div>
  );
}
