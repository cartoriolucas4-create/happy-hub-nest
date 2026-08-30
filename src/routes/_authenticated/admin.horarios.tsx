import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, Empty, btn, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";
import { DIAS, hhmm } from "@/lib/barber";

export const Route = createFileRoute("/_authenticated/admin/horarios")({
  head: () => ({
    meta: [
      { title: "Horários | BarberFlow" },
      { name: "description", content: "Defina o funcionamento da barbearia e a jornada de cada barbeiro." },
      { property: "og:title", content: "Horários | BarberFlow" },
      { property: "og:description", content: "Horários de funcionamento e jornadas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Horarios,
});

type Linha = {
  dia_semana: number;
  aberto: boolean;
  hora_inicio: string;
  hora_fim: string;
  intervalo_inicio: string;
  intervalo_fim: string;
};

const padrao = (d: number): Linha => ({
  dia_semana: d,
  aberto: false,
  hora_inicio: "",
  hora_fim: "",
  intervalo_inicio: "",
  intervalo_fim: "",
});

function Horarios() {
  const { data: shop } = useShop();
  const qc = useQueryClient();
  const [linhas, setLinhas] = useState<Linha[]>(DIAS.map((_, i) => padrao(i)));
  const [barbeiro, setBarbeiro] = useState("");

  const { data } = useQuery({
    queryKey: ["horarios", shop?.id],
    enabled: Boolean(shop?.id),
    queryFn: async () => {
      const [bh, barbers] = await Promise.all([
        supabase.from("business_hours").select("*").order("dia_semana"),
        supabase.from("barbers").select("id, nome").eq("ativo", true).order("nome"),
      ]);
      if (bh.error) throw bh.error;
      return { bh: bh.data, barbers: barbers.data ?? [] };
    },
  });

  useEffect(() => {
    if (!data) return;
    setLinhas(
      DIAS.map((_, i) => {
        const row = data.bh.find((r) => r.dia_semana === i);
        if (!row) return padrao(i);
        return {
          dia_semana: i,
          aberto: row.aberto,
          hora_inicio: hhmm(row.hora_inicio),
          hora_fim: hhmm(row.hora_fim),
          intervalo_inicio: hhmm(row.intervalo_inicio),
          intervalo_fim: hhmm(row.intervalo_fim),
        };
      }),
    );
  }, [data]);

  const { data: jornada } = useQuery({
    queryKey: ["barber-hours", barbeiro],
    enabled: Boolean(barbeiro),
    queryFn: async () => {
      const { data, error } = await supabase.from("barber_hours").select("*").eq("barber_id", barbeiro);
      if (error) throw error;
      return data;
    },
  });

  const salvar = useMutation({
    mutationFn: async () => {
      for (const l of linhas) {
        if (l.aberto && (!l.hora_inicio || !l.hora_fim || l.hora_fim <= l.hora_inicio)) {
          throw new Error(`${DIAS[l.dia_semana]}: o horário final deve ser depois do inicial.`);
        }
        if (l.intervalo_inicio && l.intervalo_fim && l.intervalo_fim <= l.intervalo_inicio) {
          throw new Error(`${DIAS[l.dia_semana]}: intervalo inválido.`);
        }
      }
      const del = await supabase.from("business_hours").delete().eq("barbershop_id", shop!.id);
      if (del.error) throw del.error;
      const res = await supabase.from("business_hours").insert(
        linhas.map((l) => ({
          barbershop_id: shop!.id,
          dia_semana: l.dia_semana,
          aberto: l.aberto,
          hora_inicio: l.hora_inicio,
          hora_fim: l.hora_fim,
          intervalo_inicio: l.intervalo_inicio || null,
          intervalo_fim: l.intervalo_fim || null,
        })),
      );
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      toast.success("Horários salvos!");
      qc.invalidateQueries({ queryKey: ["horarios"] });
      qc.invalidateQueries({ queryKey: ["barbershop-setup-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const salvarJornada = useMutation({
    mutationFn: async (rows: { dia_semana: number; hora_inicio: string; hora_fim: string; ativo: boolean }[]) => {
      const del = await supabase.from("barber_hours").delete().eq("barber_id", barbeiro);
      if (del.error) throw del.error;
      const ativos = rows.filter((r) => r.ativo);
      if (ativos.length) {
        const res = await supabase
          .from("barber_hours")
          .insert(ativos.map((r) => ({ ...r, barber_id: barbeiro, barbershop_id: shop!.id })));
        if (res.error) throw res.error;
      }
    },
    onSuccess: () => {
      toast.success("Jornada do barbeiro salva!");
      qc.invalidateQueries({ queryKey: ["barber-hours"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [jornadaLocal, setJornadaLocal] = useState<
    { dia_semana: number; hora_inicio: string; hora_fim: string; ativo: boolean }[]
  >([]);

  useEffect(() => {
    setJornadaLocal(
      DIAS.map((_, i) => {
        const row = jornada?.find((j) => j.dia_semana === i);
        return {
          dia_semana: i,
          hora_inicio: row ? hhmm(row.hora_inicio) : "09:00",
          hora_fim: row ? hhmm(row.hora_fim) : "19:00",
          ativo: Boolean(row?.ativo),
        };
      }),
    );
  }, [jornada]);

  return (
    <AdminShell title="Horários" subtitle="Funcionamento da barbearia e jornada por barbeiro">
      <section>
        <h2 className="text-2xl">Funcionamento da barbearia</h2>
        <div className="mt-4 space-y-3">
          {linhas.map((l, i) => (
            <div key={l.dia_semana} className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-6">
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={l.aberto}
                  onChange={(e) => {
                    const c = [...linhas];
                    c[i] = { ...l, aberto: e.target.checked };
                    setLinhas(c);
                  }}
                />
                {DIAS[l.dia_semana]}
              </label>
              {(
                [
                  ["hora_inicio", "Abre"],
                  ["hora_fim", "Fecha"],
                  ["intervalo_inicio", "Almoço início"],
                  ["intervalo_fim", "Almoço fim"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
                  <input
                    type="time"
                    disabled={!l.aberto}
                    value={l[key]}
                    onChange={(e) => {
                      const c = [...linhas];
                      c[i] = { ...l, [key]: e.target.value };
                      setLinhas(c);
                    }}
                    className={`${input} disabled:opacity-40`}
                  />
                </label>
              ))}
            </div>
          ))}
        </div>
        <button className={`${btn} mt-4`} disabled={salvar.isPending} onClick={() => salvar.mutate()}>
          {salvar.isPending ? "SALVANDO..." : "SALVAR FUNCIONAMENTO"}
        </button>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl">Jornada por barbeiro</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Opcional: quando definida, limita os horários disponíveis do profissional.
        </p>
        {data?.barbers.length === 0 ? (
          <div className="mt-4">
            <Empty>Cadastre barbeiros para definir jornadas individuais.</Empty>
          </div>
        ) : (
          <>
            <select
              value={barbeiro}
              onChange={(e) => setBarbeiro(e.target.value)}
              className={`${input} mt-4 max-w-xs`}
            >
              <option value="">Selecione um barbeiro</option>
              {(data?.barbers ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </select>

            {barbeiro && (
              <>
                <div className="mt-4 space-y-3">
                  {jornadaLocal.map((j, i) => (
                    <div key={j.dia_semana} className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-4">
                      <label className="flex items-center gap-2 text-sm sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={j.ativo}
                          onChange={(e) => {
                            const c = [...jornadaLocal];
                            c[i] = { ...j, ativo: e.target.checked };
                            setJornadaLocal(c);
                          }}
                        />
                        {DIAS[j.dia_semana]}
                      </label>
                      <input
                        type="time"
                        value={j.hora_inicio}
                        disabled={!j.ativo}
                        onChange={(e) => {
                          const c = [...jornadaLocal];
                          c[i] = { ...j, hora_inicio: e.target.value };
                          setJornadaLocal(c);
                        }}
                        className={`${input} disabled:opacity-40`}
                      />
                      <input
                        type="time"
                        value={j.hora_fim}
                        disabled={!j.ativo}
                        onChange={(e) => {
                          const c = [...jornadaLocal];
                          c[i] = { ...j, hora_fim: e.target.value };
                          setJornadaLocal(c);
                        }}
                        className={`${input} disabled:opacity-40`}
                      />
                    </div>
                  ))}
                </div>
                <button
                  className={`${btn} mt-4`}
                  disabled={salvarJornada.isPending}
                  onClick={() => salvarJornada.mutate(jornadaLocal)}
                >
                  {salvarJornada.isPending ? "SALVANDO..." : "SALVAR JORNADA"}
                </button>
              </>
            )}
          </>
        )}
      </section>
    </AdminShell>
  );
}
