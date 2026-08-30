import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, Empty, btn, btnGhost, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/admin/barbeiros")({
  head: () => ({
    meta: [
      { title: "Barbeiros | BarberFlow" },
      { name: "description", content: "Cadastre a equipe de barbeiros e os serviços de cada um." },
      { property: "og:title", content: "Barbeiros | BarberFlow" },
      { property: "og:description", content: "Gestão da equipe da barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Barbeiros,
});

type Form = {
  id?: string;
  nome: string;
  telefone: string;
  descricao: string;
  foto_url: string;
  ativo: boolean;
  servicos: string[];
};

const vazio: Form = { nome: "", telefone: "", descricao: "", foto_url: "", ativo: true, servicos: [] };

function Barbeiros() {
  const { data: shop } = useShop();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["barbeiros", shop?.id],
    enabled: Boolean(shop?.id),
    queryFn: async () => {
      const [barbers, services, links] = await Promise.all([
        supabase.from("barbers").select("*").order("nome"),
        supabase.from("services").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("barber_services").select("barber_id, service_id"),
      ]);
      if (barbers.error) throw barbers.error;
      return {
        barbers: barbers.data,
        services: services.data ?? [],
        links: links.data ?? [],
      };
    },
  });

  const salvar = useMutation({
    mutationFn: async (f: Form) => {
      const payload = {
        barbershop_id: shop!.id,
        nome: f.nome.trim(),
        telefone: f.telefone.trim() || null,
        descricao: f.descricao.trim() || null,
        foto_url: f.foto_url.trim() || null,
        ativo: f.ativo,
      };
      let id = f.id;
      if (id) {
        const res = await supabase.from("barbers").update(payload).eq("id", id);
        if (res.error) throw res.error;
      } else {
        const res = await supabase.from("barbers").insert(payload).select("id").single();
        if (res.error) throw res.error;
        id = res.data.id;
      }
      const del = await supabase.from("barber_services").delete().eq("barber_id", id!);
      if (del.error) throw del.error;
      if (f.servicos.length) {
        const ins = await supabase.from("barber_services").insert(
          f.servicos.map((service_id) => ({ barbershop_id: shop!.id, barber_id: id!, service_id })),
        );
        if (ins.error) throw ins.error;
      }
    },
    onSuccess: () => {
      toast.success("Barbeiro salvo!");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["barbeiros"] });
      qc.invalidateQueries({ queryKey: ["barbershop-setup-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("barbers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Barbeiro excluído.");
      qc.invalidateQueries({ queryKey: ["barbeiros"] });
      qc.invalidateQueries({ queryKey: ["barbershop-setup-status"] });
    },
    onError: () => toast.error("Não foi possível excluir. Desative o barbeiro se ele já possui agendamentos."),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (form.nome.trim().length < 2) {
      toast.error("Informe o nome do barbeiro.");
      return;
    }
    salvar.mutate(form);
  }

  return (
    <AdminShell
      title="Barbeiros"
      subtitle="Equipe e serviços que cada profissional executa"
      actions={
        <button onClick={() => setForm(vazio)} className={btn}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> NOVO BARBEIRO
          </span>
        </button>
      }
    >
      {form && (
        <form onSubmit={submit} className="mb-8 grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
          <label>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Nome</span>
            <input className={input} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </label>
          <label>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Telefone</span>
            <input
              className={input}
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Especialidade</span>
            <input
              className={input}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">URL da foto</span>
            <input
              className={input}
              value={form.foto_url}
              onChange={(e) => setForm({ ...form, foto_url: e.target.value })}
            />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="text-xs uppercase tracking-widest text-muted-foreground">Serviços que executa</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(data?.services ?? []).map((s) => {
                const on = form.servicos.includes(s.id);
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() =>
                      setForm({
                        ...form,
                        servicos: on ? form.servicos.filter((x) => x !== s.id) : [...form.servicos, s.id],
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {s.nome}
                  </button>
                );
              })}
              {data?.services.length === 0 && (
                <span className="text-sm text-muted-foreground">Cadastre serviços primeiro.</span>
              )}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
            Barbeiro ativo
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button className={btn} disabled={salvar.isPending}>
              {salvar.isPending ? "SALVANDO..." : "SALVAR"}
            </button>
            <button type="button" className={btnGhost} onClick={() => setForm(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {isLoading && <Empty>Carregando...</Empty>}
      {data?.barbers.length === 0 && <Empty>Nenhum barbeiro cadastrado ainda.</Empty>}
      <div className="grid gap-3 sm:grid-cols-2">
        {(data?.barbers ?? []).map((b) => {
          const servicos = (data?.links ?? []).filter((l) => l.barber_id === b.id).map((l) => l.service_id);
          return (
            <div key={b.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-5">
              <div>
                <h3 className="text-xl">
                  {b.nome} {b.ativo ? "" : <span className="text-sm text-muted-foreground">· inativo</span>}
                </h3>
                {b.descricao && <p className="text-sm text-muted-foreground">{b.descricao}</p>}
                <p className="mt-2 text-xs text-muted-foreground">
                  {servicos.length} serviço(s) vinculado(s)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  aria-label="Editar"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() =>
                    setForm({
                      id: b.id,
                      nome: b.nome,
                      telefone: b.telefone ?? "",
                      descricao: b.descricao ?? "",
                      foto_url: b.foto_url ?? "",
                      ativo: b.ativo,
                      servicos,
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  aria-label="Excluir"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Excluir o barbeiro "${b.nome}"?`)) excluir.mutate(b.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
