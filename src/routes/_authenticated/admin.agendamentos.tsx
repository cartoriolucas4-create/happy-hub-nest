import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, Empty, btn, btnGhost, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";
import {
  brDate,
  brl,
  hhmm,
  isPhone,
  STATUS_LABEL,
  STATUS_LIST,
  statusClass,
  todayIso,
  type Status,
} from "@/lib/barber";

export const Route = createFileRoute("/_authenticated/admin/agendamentos")({
  head: () => ({
    meta: [
      { title: "Agendamentos | BarberFlow" },
      { name: "description", content: "Lista completa de agendamentos com filtros e status." },
      { property: "og:title", content: "Agendamentos | BarberFlow" },
      { property: "og:description", content: "Gestão de agendamentos da barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Agendamentos,
});

function addMinutes(hora: string, minutos: number) {
  const [h, m] = hora.split(":").map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + minutos;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function Agendamentos() {
  const { data: shop } = useShop();
  const qc = useQueryClient();
  const [de, setDe] = useState(todayIso());
  const [ate, setAte] = useState(todayIso());
  const [status, setStatus] = useState("");
  const [barbeiro, setBarbeiro] = useState("");
  const [pagamento, setPagamento] = useState("");
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({
    cliente_nome: "",
    cliente_telefone: "",
    barber_id: "",
    service_id: "",
    data: todayIso(),
    hora: "09:00",
    observacao: "",
  });

  const { data: base } = useQuery({
    queryKey: ["base-agendamentos", shop?.id],
    enabled: Boolean(shop?.id),
    queryFn: async () => {
      const [barbers, services, pagamentos] = await Promise.all([
        supabase.from("barbers").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("services").select("id, nome, preco, duracao_minutos").eq("ativo", true).order("nome"),
        supabase.from("payment_methods").select("id, name").order("display_order"),
      ]);
      return {
        barbers: barbers.data ?? [],
        services: services.data ?? [],
        pagamentos: pagamentos.data ?? [],
      };
    },
  });

  const { data: lista, isLoading } = useQuery({
    queryKey: ["agendamentos", shop?.id, de, ate, status, barbeiro, pagamento],
    enabled: Boolean(shop?.id),
    queryFn: async () => {
      let q = supabase
        .from("appointments")
        .select("*, barbers(nome), services(nome)")
        .gte("data", de)
        .lte("data", ate)
        .order("data")
        .order("hora_inicio");
      if (status) q = q.eq("status", status as Status);
      if (barbeiro) q = q.eq("barber_id", barbeiro);
      if (pagamento) q = q.eq("payment_method_id", pagamento);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const mudarStatus = useMutation({
    mutationFn: async ({ id, s }: { id: string; s: Status }) => {
      const { error } = await supabase.from("appointments").update({ status: s }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const criar = useMutation({
    mutationFn: async () => {
      const servico = base?.services.find((s) => s.id === form.service_id);
      if (!servico) throw new Error("Selecione um serviço.");
      if (!form.barber_id) throw new Error("Selecione um barbeiro.");
      if (form.cliente_nome.trim().length < 3) throw new Error("Informe o nome do cliente.");
      if (!isPhone(form.cliente_telefone)) throw new Error("Informe um telefone válido.");

      const { error } = await supabase.from("appointments").insert({
        barbershop_id: shop!.id,
        barber_id: form.barber_id,
        service_id: form.service_id,
        cliente_nome: form.cliente_nome.trim(),
        cliente_telefone: form.cliente_telefone.trim(),
        data: form.data,
        hora_inicio: form.hora,
        hora_fim: addMinutes(form.hora, servico.duracao_minutos),
        valor: servico.preco,
        observacao: form.observacao.trim() || null,
        status: "confirmado" as Status,
      });
      if (error) {
        throw new Error(
          error.message.includes("appointments_no_overlap") || error.code === "23P01"
            ? "Esse barbeiro já possui um agendamento nesse horário."
            : error.message,
        );
      }
    },
    onSuccess: () => {
      toast.success("Agendamento criado!");
      setNovo(false);
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell
      title="Agendamentos"
      subtitle="Filtre por período, status e barbeiro"
      actions={
        <button className={btn} onClick={() => setNovo(true)}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> NOVO AGENDAMENTO
          </span>
        </button>
      }
    >
      {novo && (
        <div className="mb-8 grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-3">
          <input
            className={input}
            placeholder="Nome do cliente"
            value={form.cliente_nome}
            onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })}
          />
          <input
            className={input}
            placeholder="Telefone"
            value={form.cliente_telefone}
            onChange={(e) => setForm({ ...form, cliente_telefone: e.target.value })}
          />
          <select
            className={input}
            value={form.barber_id}
            onChange={(e) => setForm({ ...form, barber_id: e.target.value })}
          >
            <option value="">Barbeiro</option>
            {(base?.barbers ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.nome}
              </option>
            ))}
          </select>
          <select
            className={input}
            value={form.service_id}
            onChange={(e) => setForm({ ...form, service_id: e.target.value })}
          >
            <option value="">Serviço</option>
            {(base?.services ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} — {brl(s.preco)}
              </option>
            ))}
          </select>
          <input
            type="date"
            className={input}
            value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
          />
          <input
            type="time"
            className={input}
            value={form.hora}
            onChange={(e) => setForm({ ...form, hora: e.target.value })}
          />
          <input
            className={`${input} sm:col-span-3`}
            placeholder="Observação (opcional)"
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
          />
          <div className="flex gap-2 sm:col-span-3">
            <button className={btn} disabled={criar.isPending} onClick={() => criar.mutate()}>
              {criar.isPending ? "SALVANDO..." : "SALVAR"}
            </button>
            <button className={btnGhost} onClick={() => setNovo(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <input type="date" className={input} value={de} onChange={(e) => setDe(e.target.value)} />
        <input type="date" className={input} value={ate} onChange={(e) => setAte(e.target.value)} />
        <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS_LIST.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select className={input} value={barbeiro} onChange={(e) => setBarbeiro(e.target.value)}>
          <option value="">Todos os barbeiros</option>
          {(base?.barbers ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </select>
        <select className={input} value={pagamento} onChange={(e) => setPagamento(e.target.value)}>
          <option value="">Todos os pagamentos</option>
          {(base?.pagamentos ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <Empty>Carregando...</Empty>}
        {!isLoading && lista?.length === 0 && <Empty>Nenhum agendamento no período.</Empty>}
        {(lista ?? []).map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
            <div>
              <p className="font-display text-lg text-primary">
                {brDate(a.data)} · {hhmm(a.hora_inicio)} – {hhmm(a.hora_fim)}
              </p>
              <p className="mt-1 text-sm">
                {a.cliente_nome} · {a.cliente_telefone}
              </p>
              <p className="text-sm text-muted-foreground">
                {a.services?.nome ?? "Serviço"} · {a.barbers?.nome} · {brl(a.valor)}
              </p>
              {a.payment_method_nome && (
                <p className="text-sm text-muted-foreground">Pagamento: {a.payment_method_nome}</p>
              )}
              {a.observacao && <p className="mt-1 text-xs text-muted-foreground">{a.observacao}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs ${statusClass(a.status)}`}>
                {STATUS_LABEL[a.status]}
              </span>
              <select
                className={`${input} w-40`}
                value={a.status}
                onChange={(e) => mudarStatus.mutate({ id: a.id, s: e.target.value as Status })}
              >
                {STATUS_LIST.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
