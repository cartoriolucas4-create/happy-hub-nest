import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, Empty, btn, btnGhost, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";
import { brDate, hhmm, isPhone, STATUS_LABEL } from "@/lib/barber";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes | BarberFlow" },
      { name: "description", content: "Base de clientes e histórico de atendimentos." },
      { property: "og:title", content: "Clientes | BarberFlow" },
      { property: "og:description", content: "Gestão de clientes da barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Clientes,
});

type Form = { id?: string; nome: string; telefone: string; email: string };

function Clientes() {
  const { data: shop } = useShop();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  const { data: clientes, isLoading } = useQuery({
    queryKey: ["clientes", shop?.id],
    enabled: Boolean(shop?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: historico } = useQuery({
    queryKey: ["historico", aberto],
    enabled: Boolean(aberto),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, data, hora_inicio, status, valor, services(nome), barbers(nome)")
        .eq("customer_id", aberto!)
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const salvar = useMutation({
    mutationFn: async (f: Form) => {
      const payload = {
        barbershop_id: shop!.id,
        nome: f.nome.trim(),
        telefone: f.telefone.trim(),
        email: f.email.trim() || null,
      };
      const res = f.id
        ? await supabase.from("customers").update(payload).eq("id", f.id)
        : await supabase.from("customers").insert(payload);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      toast.success("Cliente salvo!");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente excluído.");
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: () => toast.error("Não foi possível excluir este cliente."),
  });

  const filtrados = (clientes ?? []).filter((c) => {
    const t = busca.toLowerCase();
    return c.nome.toLowerCase().includes(t) || c.telefone.includes(busca);
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (form.nome.trim().length < 2) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    if (!isPhone(form.telefone)) {
      toast.error("Informe um telefone válido com DDD.");
      return;
    }
    salvar.mutate(form);
  }

  return (
    <AdminShell
      title="Clientes"
      subtitle="Cadastro e histórico de atendimentos"
      actions={
        <button onClick={() => setForm({ nome: "", telefone: "", email: "" })} className={btn}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> NOVO CLIENTE
          </span>
        </button>
      }
    >
      {form && (
        <form onSubmit={submit} className="mb-8 grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-3">
          <input
            className={input}
            placeholder="Nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <input
            className={input}
            placeholder="Telefone"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
          />
          <input
            className={input}
            placeholder="E-mail (opcional)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <div className="flex gap-2 sm:col-span-3">
            <button className={btn} disabled={salvar.isPending}>
              SALVAR
            </button>
            <button type="button" className={btnGhost} onClick={() => setForm(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mb-6 flex items-center gap-2 rounded-md border border-input bg-card px-3">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou telefone"
          className="w-full bg-transparent py-2.5 text-sm outline-none"
        />
      </div>

      {isLoading && <Empty>Carregando...</Empty>}
      {!isLoading && filtrados.length === 0 && <Empty>Nenhum cliente encontrado.</Empty>}
      <div className="space-y-3">
        {filtrados.map((c) => (
          <div key={c.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg">{c.nome}</h3>
                <p className="text-sm text-muted-foreground">
                  {c.telefone} {c.email ? `· ${c.email}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className={btnGhost}
                  onClick={() => setAberto(aberto === c.id ? null : c.id)}
                >
                  {aberto === c.id ? "Fechar" : "Histórico"}
                </button>
                <button
                  aria-label="Editar"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => setForm({ id: c.id, nome: c.nome, telefone: c.telefone, email: c.email ?? "" })}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  aria-label="Excluir"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Excluir o cliente "${c.nome}"?`)) excluir.mutate(c.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {aberto === c.id && (
              <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                {(historico ?? []).length === 0 && (
                  <p className="text-muted-foreground">Nenhum atendimento registrado.</p>
                )}
                {(historico ?? []).map((h) => (
                  <p key={h.id} className="text-muted-foreground">
                    {brDate(h.data)} às {hhmm(h.hora_inicio)} · {h.services?.nome ?? "Serviço"} ·{" "}
                    {h.barbers?.nome} · {STATUS_LABEL[h.status]}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
