import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, Empty, btn, btnGhost, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";
import { brl } from "@/lib/barber";

export const Route = createFileRoute("/_authenticated/admin/servicos")({
  head: () => ({
    meta: [
      { title: "Serviços | BarberFlow" },
      { name: "description", content: "Cadastre serviços, preços e duração da sua barbearia." },
      { property: "og:title", content: "Serviços | BarberFlow" },
      { property: "og:description", content: "Gestão de serviços da barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Servicos,
});

type Form = {
  id?: string;
  nome: string;
  descricao: string;
  preco: string;
  duracao_minutos: string;
  ativo: boolean;
};

const vazio: Form = { nome: "", descricao: "", preco: "", duracao_minutos: "30", ativo: true };

function Servicos() {
  const { data: shop } = useShop();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);

  const { data: servicos, isLoading } = useQuery({
    queryKey: ["servicos", shop?.id],
    enabled: Boolean(shop?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const salvar = useMutation({
    mutationFn: async (f: Form) => {
      const payload = {
        barbershop_id: shop!.id,
        nome: f.nome.trim(),
        descricao: f.descricao.trim() || null,
        preco: Number(f.preco.replace(",", ".")),
        duracao_minutos: Number(f.duracao_minutos),
        ativo: f.ativo,
      };
      const res = f.id
        ? await supabase.from("services").update(payload).eq("id", f.id)
        : await supabase.from("services").insert(payload);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      toast.success("Serviço salvo!");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["servicos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Serviço excluído.");
      qc.invalidateQueries({ queryKey: ["servicos"] });
    },
    onError: () => toast.error("Não foi possível excluir. Desative o serviço se ele já possui agendamentos."),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (form.nome.trim().length < 2) {
      toast.error("Informe o nome do serviço.");
      return;
    }
    const preco = Number(form.preco.replace(",", "."));
    if (!Number.isFinite(preco) || preco < 0) {
      toast.error("Informe um preço válido.");
      return;
    }
    if (Number(form.duracao_minutos) < 5) {
      toast.error("A duração mínima é de 5 minutos.");
      return;
    }
    salvar.mutate(form);
  }

  return (
    <AdminShell
      title="Serviços"
      subtitle="Preço e duração usados no agendamento online"
      actions={
        <button onClick={() => setForm(vazio)} className={btn}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> NOVO SERVIÇO
          </span>
        </button>
      }
    >
      {form && (
        <form onSubmit={submit} className="mb-8 grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Nome</span>
            <input className={input} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Descrição</span>
            <input
              className={input}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </label>
          <label>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Preço (R$)</span>
            <input className={input} value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} />
          </label>
          <label>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Duração (min)</span>
            <input
              type="number"
              min={5}
              step={5}
              className={input}
              value={form.duracao_minutos}
              onChange={(e) => setForm({ ...form, duracao_minutos: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
            Serviço ativo
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
      {servicos?.length === 0 && <Empty>Nenhum serviço cadastrado ainda.</Empty>}
      <div className="grid gap-3 sm:grid-cols-2">
        {(servicos ?? []).map((s) => (
          <div key={s.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl">{s.nome}</h3>
                <p className="text-sm text-muted-foreground">
                  {brl(s.preco)} · {s.duracao_minutos} min {s.ativo ? "" : "· inativo"}
                </p>
                {s.descricao && <p className="mt-2 text-sm text-muted-foreground">{s.descricao}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  aria-label="Editar"
                  onClick={() =>
                    setForm({
                      id: s.id,
                      nome: s.nome,
                      descricao: s.descricao ?? "",
                      preco: String(s.preco),
                      duracao_minutos: String(s.duracao_minutos),
                      ativo: s.ativo,
                    })
                  }
                  className="text-muted-foreground hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  aria-label="Excluir"
                  onClick={() => {
                    if (confirm(`Excluir o serviço "${s.nome}"?`)) excluir.mutate(s.id);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
