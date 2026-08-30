import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, Empty, btn, btnGhost, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";
import { brDate, hhmm, todayIso } from "@/lib/barber";

export const Route = createFileRoute("/_authenticated/admin/bloqueios")({
  head: () => ({
    meta: [
      { title: "Bloqueios | BarberFlow" },
      { name: "description", content: "Bloqueie datas e horários de férias, folgas e eventos." },
      { property: "og:title", content: "Bloqueios | BarberFlow" },
      { property: "og:description", content: "Bloqueios de agenda da barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Bloqueios,
});

function Bloqueios() {
  const { data: shop } = useShop();
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({
    data: todayIso(),
    hora_inicio: "09:00",
    hora_fim: "19:00",
    barber_id: "",
    motivo: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["bloqueios", shop?.id],
    enabled: Boolean(shop?.id),
    queryFn: async () => {
      const [bloq, barbers] = await Promise.all([
        supabase.from("blocked_times").select("*, barbers(nome)").order("data", { ascending: false }),
        supabase.from("barbers").select("id, nome").eq("ativo", true).order("nome"),
      ]);
      if (bloq.error) throw bloq.error;
      return { bloqueios: bloq.data, barbers: barbers.data ?? [] };
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      if (form.hora_fim <= form.hora_inicio) throw new Error("O horário final deve ser depois do inicial.");
      const { error } = await supabase.from("blocked_times").insert({
        barbershop_id: shop!.id,
        data: form.data,
        hora_inicio: form.hora_inicio,
        hora_fim: form.hora_fim,
        barber_id: form.barber_id || null,
        motivo: form.motivo.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bloqueio criado!");
      setAberto(false);
      qc.invalidateQueries({ queryKey: ["bloqueios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_times").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bloqueio removido.");
      qc.invalidateQueries({ queryKey: ["bloqueios"] });
    },
  });

  return (
    <AdminShell
      title="Bloqueios"
      subtitle="Férias, folgas e eventos que travam a agenda"
      actions={
        <button className={btn} onClick={() => setAberto(true)}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> NOVO BLOQUEIO
          </span>
        </button>
      }
    >
      {aberto && (
        <div className="mb-8 grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-5">
          <label>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Data</span>
            <input
              type="date"
              className={input}
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
            />
          </label>
          <label>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Início</span>
            <input
              type="time"
              className={input}
              value={form.hora_inicio}
              onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
            />
          </label>
          <label>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Fim</span>
            <input
              type="time"
              className={input}
              value={form.hora_fim}
              onChange={(e) => setForm({ ...form, hora_fim: e.target.value })}
            />
          </label>
          <label>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Barbeiro</span>
            <select
              className={input}
              value={form.barber_id}
              onChange={(e) => setForm({ ...form, barber_id: e.target.value })}
            >
              <option value="">Toda a barbearia</option>
              {(data?.barbers ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Motivo</span>
            <input
              className={input}
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
            />
          </label>
          <div className="flex gap-2 sm:col-span-5">
            <button className={btn} disabled={criar.isPending} onClick={() => criar.mutate()}>
              SALVAR
            </button>
            <button className={btnGhost} onClick={() => setAberto(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading && <Empty>Carregando...</Empty>}
      {data?.bloqueios.length === 0 && <Empty>Nenhum bloqueio cadastrado.</Empty>}
      <div className="space-y-3">
        {(data?.bloqueios ?? []).map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
            <div>
              <p className="font-display text-lg text-primary">
                {brDate(b.data)} · {hhmm(b.hora_inicio)} – {hhmm(b.hora_fim)}
              </p>
              <p className="text-sm text-muted-foreground">
                {b.barbers?.nome ?? "Toda a barbearia"} {b.motivo ? `· ${b.motivo}` : ""}
              </p>
            </div>
            <button
              aria-label="Excluir bloqueio"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => excluir.mutate(b.id)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
