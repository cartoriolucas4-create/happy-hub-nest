import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, btn, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";
import { DIAS } from "@/lib/barber";

export const Route = createFileRoute("/_authenticated/admin/configurar")({
  head: () => ({
    meta: [
      { title: "Configuração inicial | BarberFlow" },
      { name: "description", content: "Configure serviços, equipe e horários da sua barbearia." },
      { property: "og:title", content: "Configuração inicial | BarberFlow" },
      { property: "og:description", content: "Onboarding da barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Configurar,
});

const servicosPadrao = [
  { nome: "Corte", preco: "45", duracao_minutos: "30" },
  { nome: "Barba", preco: "35", duracao_minutos: "30" },
  { nome: "Corte + Barba", preco: "70", duracao_minutos: "60" },
];

function Configurar() {
  const { data: shop } = useShop();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [servicos, setServicos] = useState(servicosPadrao);
  const [barbeiro, setBarbeiro] = useState("");
  const [abre, setAbre] = useState("09:00");
  const [fecha, setFecha] = useState("19:00");
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5, 6]);

  const concluir = useMutation({
    mutationFn: async () => {
      if (!shop) throw new Error("Barbearia não encontrada.");
      if (barbeiro.trim().length < 2) throw new Error("Informe o nome de pelo menos um barbeiro.");
      if (fecha <= abre) throw new Error("O horário de fechamento deve ser depois da abertura.");
      if (dias.length === 0) throw new Error("Selecione ao menos um dia de funcionamento.");

      const validos = servicos.filter((s) => s.nome.trim() && Number(s.preco.replace(",", ".")) >= 0);
      if (validos.length === 0) throw new Error("Cadastre ao menos um serviço.");

      const insServ = await supabase
        .from("services")
        .insert(
          validos.map((s) => ({
            barbershop_id: shop.id,
            nome: s.nome.trim(),
            preco: Number(s.preco.replace(",", ".")),
            duracao_minutos: Number(s.duracao_minutos),
          })),
        )
        .select("id");
      if (insServ.error) throw insServ.error;

      const insBarb = await supabase
        .from("barbers")
        .insert({ barbershop_id: shop.id, nome: barbeiro.trim() })
        .select("id")
        .single();
      if (insBarb.error) throw insBarb.error;

      const links = await supabase.from("barber_services").insert(
        insServ.data.map((s) => ({
          barbershop_id: shop.id,
          barber_id: insBarb.data.id,
          service_id: s.id,
        })),
      );
      if (links.error) throw links.error;

      const delHoras = await supabase.from("business_hours").delete().eq("barbershop_id", shop.id);
      if (delHoras.error) throw delHoras.error;
      const insHoras = await supabase.from("business_hours").insert(
        DIAS.map((_, i) => ({
          barbershop_id: shop.id,
          dia_semana: i,
          aberto: dias.includes(i),
          hora_inicio: abre,
          hora_fim: fecha,
        })),
      );
      if (insHoras.error) throw insHoras.error;

      const upd = await supabase
        .from("barbershops")
        .update({ onboarding_concluido: true })
        .eq("id", shop.id);
      if (upd.error) throw upd.error;
    },
    onSuccess: () => {
      toast.success("Barbearia configurada! Seu link já está no ar.");
      qc.invalidateQueries();
      navigate({ to: "/admin/meu-link" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell title="Configuração inicial" subtitle="Três passos rápidos para começar a receber agendamentos">
      <div className="max-w-3xl space-y-10">
        <section>
          <h2 className="text-2xl">1. Serviços</h2>
          <div className="mt-4 space-y-3">
            {servicos.map((s, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-3">
                <input
                  className={input}
                  placeholder="Serviço"
                  value={s.nome}
                  onChange={(e) => {
                    const c = [...servicos];
                    c[i] = { ...s, nome: e.target.value };
                    setServicos(c);
                  }}
                />
                <input
                  className={input}
                  placeholder="Preço"
                  value={s.preco}
                  onChange={(e) => {
                    const c = [...servicos];
                    c[i] = { ...s, preco: e.target.value };
                    setServicos(c);
                  }}
                />
                <input
                  type="number"
                  min={5}
                  step={5}
                  className={input}
                  value={s.duracao_minutos}
                  onChange={(e) => {
                    const c = [...servicos];
                    c[i] = { ...s, duracao_minutos: e.target.value };
                    setServicos(c);
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl">2. Primeiro barbeiro</h2>
          <input
            className={`${input} mt-4 max-w-sm`}
            placeholder="Nome do barbeiro"
            value={barbeiro}
            onChange={(e) => setBarbeiro(e.target.value)}
          />
        </section>

        <section>
          <h2 className="text-2xl">3. Funcionamento</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {DIAS.map((d, i) => {
              const on = dias.includes(i);
              return (
                <button
                  key={d}
                  onClick={() => setDias(on ? dias.filter((x) => x !== i) : [...dias, i])}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {d.slice(0, 3)}
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid max-w-sm gap-3 sm:grid-cols-2">
            <input type="time" className={input} value={abre} onChange={(e) => setAbre(e.target.value)} />
            <input type="time" className={input} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </section>

        <button className={btn} disabled={concluir.isPending} onClick={() => concluir.mutate()}>
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4" /> {concluir.isPending ? "SALVANDO..." : "CONCLUIR CONFIGURAÇÃO"}
          </span>
        </button>
      </div>
    </AdminShell>
  );
}
