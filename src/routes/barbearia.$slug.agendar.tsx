import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brDate, brl, hhmm, isEmail, isPhone, todayIso, addDays } from "@/lib/barber";

export const Route = createFileRoute("/barbearia/$slug/agendar")({
  head: ({ params }) => ({
    meta: [
      { title: `Agendar horário online | ${params.slug}` },
      {
        name: "description",
        content: "Escolha serviço, profissional, data e horário e confirme seu agendamento online.",
      },
      { property: "og:title", content: `Agendar horário | ${params.slug}` },
      { property: "og:description", content: "Agendamento online rápido, 24 horas por dia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Agendar,
});

const inputCls =
  "w-full rounded-md border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary";

function Agendar() {
  const { slug } = Route.useParams();
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [data, setData] = useState(todayIso());
  const [hora, setHora] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [observacao, setObservacao] = useState("");
  const [comprovante, setComprovante] = useState<{
    barbearia: string;
    barbeiro: string;
    servico: string;
    data: string;
    hora_inicio: string;
    valor: number;
    cliente_nome: string;
    endereco: string | null;
  } | null>(null);

  const { data: base, isLoading } = useQuery({
    queryKey: ["agendar-base", slug],
    queryFn: async () => {
      const shop = await supabase.from("barbershops").select("id, nome, slug").eq("slug", slug).maybeSingle();
      if (shop.error) throw shop.error;
      if (!shop.data) return null;
      const [services, barbers, links] = await Promise.all([
        supabase.from("services").select("*").eq("barbershop_id", shop.data.id).eq("ativo", true).order("preco"),
        supabase.from("barbers").select("*").eq("barbershop_id", shop.data.id).eq("ativo", true).order("nome"),
        supabase.from("barber_services").select("barber_id, service_id").eq("barbershop_id", shop.data.id),
      ]);
      return {
        shop: shop.data,
        services: services.data ?? [],
        barbers: barbers.data ?? [],
        links: links.data ?? [],
      };
    },
  });

  const servico = base?.services.find((s) => s.id === serviceId);
  const barbeirosDoServico = (base?.barbers ?? []).filter((b) => {
    const vinculos = (base?.links ?? []).filter((l) => l.service_id === serviceId);
    return vinculos.length === 0 ? true : vinculos.some((l) => l.barber_id === b.id);
  });

  const { data: horarios, isFetching: buscandoHorarios } = useQuery({
    queryKey: ["horarios", slug, barberId, serviceId, data],
    enabled: step === 3 && Boolean(barberId && serviceId && data),
    queryFn: async () => {
      const { data: res, error } = await supabase.rpc("horarios_disponiveis", {
        p_slug: slug,
        p_barber_id: barberId,
        p_service_id: serviceId,
        p_data: data,
      });
      if (error) throw error;
      return res ?? [];
    },
  });

  const confirmar = useMutation({
    mutationFn: async () => {
      if (nome.trim().length < 3) throw new Error("Informe seu nome completo.");
      if (!isPhone(telefone)) throw new Error("Informe um telefone válido com DDD.");
      if (email && !isEmail(email)) throw new Error("E-mail inválido.");
      const { data: id, error } = await supabase.rpc("criar_agendamento_publico", {
        p_slug: slug,
        p_barber_id: barberId,
        p_service_id: serviceId,
        p_data: data,
        p_hora: hora,
        p_nome: nome.trim(),
        p_telefone: telefone.trim(),
        ...(email.trim() ? { p_email: email.trim() } : {}),
        ...(observacao.trim() ? { p_observacao: observacao.trim() } : {}),

      });
      if (error) throw new Error(error.message);
      const recibo = await supabase.rpc("agendamento_publico", { p_id: id as string });
      if (recibo.error) throw recibo.error;
      return recibo.data?.[0] ?? null;
    },
    onSuccess: (r) => {
      if (r) setComprovante(r);
      setStep(5);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Centro>Carregando...</Centro>;
  if (!base) {
    return (
      <Centro>
        <h1 className="text-3xl">Barbearia não encontrada.</h1>
        <Link to="/" className="mt-4 inline-block text-primary underline">
          Voltar ao início
        </Link>
      </Centro>
    );
  }

  if (step === 5) {
    return (
      <Centro>
        <Check className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
        <h1 className="mt-6 text-4xl">Agendamento confirmado!</h1>
        {comprovante && (
          <div className="mx-auto mt-8 max-w-md rounded-lg border border-border bg-card p-6 text-left text-sm">
            <p className="font-display text-2xl text-primary">
              {brDate(comprovante.data)} às {hhmm(comprovante.hora_inicio)}
            </p>
            <p className="mt-4">{comprovante.barbearia}</p>
            <p className="text-muted-foreground">
              {comprovante.servico} com {comprovante.barbeiro} · {brl(comprovante.valor)}
            </p>
            <p className="mt-2 text-muted-foreground">Cliente: {comprovante.cliente_nome}</p>
            {comprovante.endereco && <p className="text-muted-foreground">{comprovante.endereco}</p>}
          </div>
        )}
        <Link
          to="/barbearia/$slug"
          params={{ slug }}
          className="mt-8 inline-block rounded-sm border border-border px-6 py-3 text-sm hover:border-primary hover:text-primary"
        >
          Voltar para a barbearia
        </Link>
      </Centro>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-xl">
        <Link
          to="/barbearia/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> {base.shop.nome}
        </Link>

        <div className="mt-6 flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`h-1 flex-1 rounded ${n <= step ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>

        {step === 1 && (
          <section className="mt-8">
            <h1 className="text-3xl">Escolha o serviço</h1>
            <div className="mt-6 space-y-3">
              {base.services.length === 0 && (
                <p className="text-muted-foreground">Esta barbearia ainda não cadastrou serviços.</p>
              )}
              {base.services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setServiceId(s.id);
                    setBarberId("");
                    setStep(2);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-card p-4 text-left hover:border-primary"
                >
                  <span>
                    <span className="text-lg">{s.nome}</span>
                    <span className="block text-sm text-muted-foreground">{s.duracao_minutos} min</span>
                  </span>
                  <span className="font-display text-xl text-primary">{brl(s.preco)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="mt-8">
            <h1 className="text-3xl">Escolha o profissional</h1>
            <div className="mt-6 space-y-3">
              {barbeirosDoServico.length === 0 && (
                <p className="text-muted-foreground">Nenhum profissional disponível para este serviço.</p>
              )}
              {barbeirosDoServico.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setBarberId(b.id);
                    setStep(3);
                  }}
                  className="flex w-full items-center gap-4 rounded-lg border border-border bg-card p-4 text-left hover:border-primary"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary font-display text-xl text-primary">
                    {b.nome.slice(0, 1)}
                  </span>
                  <span>
                    <span className="text-lg">{b.nome}</span>
                    {b.descricao && <span className="block text-sm text-muted-foreground">{b.descricao}</span>}
                  </span>
                </button>
              ))}
            </div>
            <button className="mt-6 text-sm text-muted-foreground underline" onClick={() => setStep(1)}>
              Voltar
            </button>
          </section>
        )}

        {step === 3 && (
          <section className="mt-8">
            <h1 className="text-3xl">Data e horário</h1>
            <input
              type="date"
              className={`${inputCls} mt-6`}
              min={todayIso()}
              max={addDays(todayIso(), 60)}
              value={data}
              onChange={(e) => {
                setData(e.target.value);
                setHora("");
              }}
            />
            <div className="mt-6 flex flex-wrap gap-2">
              {buscandoHorarios && <p className="text-sm text-muted-foreground">Buscando horários...</p>}
              {!buscandoHorarios && (horarios ?? []).length === 0 && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" /> Nenhum horário disponível nesta data.
                </p>
              )}
              {(horarios ?? []).map((h) => (
                <button
                  key={h.hora}
                  onClick={() => {
                    setHora(hhmm(h.hora));
                    setStep(4);
                  }}
                  className="rounded-md border border-border bg-card px-4 py-2 font-display text-lg hover:border-primary hover:text-primary"
                >
                  {hhmm(h.hora)}
                </button>
              ))}
            </div>
            <button className="mt-6 text-sm text-muted-foreground underline" onClick={() => setStep(2)}>
              Voltar
            </button>
          </section>
        )}

        {step === 4 && (
          <section className="mt-8">
            <h1 className="text-3xl">Seus dados</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {servico?.nome} · {brDate(data)} às {hora} · {brl(servico?.preco ?? 0)}
            </p>
            <form
              className="mt-6 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                confirmar.mutate();
              }}
            >
              <input
                className={inputCls}
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
              <input
                className={inputCls}
                placeholder="Telefone / WhatsApp"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
              />
              <input
                className={inputCls}
                placeholder="E-mail (opcional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <textarea
                className={inputCls}
                rows={3}
                placeholder="Observação (opcional)"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
              <button
                disabled={confirmar.isPending}
                className="w-full rounded-md bg-primary py-3 font-display text-lg tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {confirmar.isPending ? "CONFIRMANDO..." : "CONFIRMAR AGENDAMENTO"}
              </button>
            </form>
            <button className="mt-6 text-sm text-muted-foreground underline" onClick={() => setStep(3)}>
              Voltar
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

function Centro({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center text-foreground">
      <div>{children}</div>
    </div>
  );
}
