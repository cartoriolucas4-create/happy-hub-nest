import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, Empty, btn, btnGhost, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/admin/pagamentos")({
  head: () => ({
    meta: [
      { title: "Métodos de pagamento | BarberFlow" },
      {
        name: "description",
        content: "Cadastre as formas de pagamento que sua barbearia aceita no agendamento.",
      },
      { property: "og:title", content: "Métodos de pagamento | BarberFlow" },
      { property: "og:description", content: "Formas de pagamento da barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Pagamentos,
});

type Metodo = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  active: boolean;
  display_order: number;
  pix_key: string | null;
  pix_key_type: string | null;
  pix_receiver_name: string | null;
  pix_city: string | null;
};

type Form = {
  id: string | null;
  name: string;
  description: string;
  icon: string;
  active: boolean;
  pix_key: string;
  pix_key_type: string;
  pix_receiver_name: string;
  pix_city: string;
};

const vazio: Form = {
  id: null,
  name: "",
  description: "",
  icon: "",
  active: true,
  pix_key: "",
  pix_key_type: "",
  pix_receiver_name: "",
  pix_city: "",
};

const SUGESTOES = ["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito", "Transferência", "Pagamento na barbearia"];
const TIPOS_PIX = ["CPF", "CNPJ", "Telefone", "E-mail", "Chave aleatória"];

function Pagamentos() {
  const { data: shop } = useShop();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);

  const { data: metodos = [], isLoading } = useQuery({
    queryKey: ["payment-methods-admin", shop?.id],
    enabled: Boolean(shop?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("id, name, description, icon, active, display_order, pix_key, pix_key_type, pix_receiver_name, pix_city")
        .eq("barbershop_id", shop!.id)
        .order("display_order")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Metodo[];
    },
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["payment-methods-admin"] });
    qc.invalidateQueries({ queryKey: ["payment-methods"] });
  };

  const isPix = (nome: string) => nome.trim().toLowerCase().startsWith("pix");

  const salvar = useMutation({
    mutationFn: async (f: Form) => {
      if (f.name.trim().length < 2) throw new Error("Informe o nome do método.");
      const t = (v: string) => v.trim() || null;
      const campos = {
        name: f.name.trim(),
        description: t(f.description),
        icon: t(f.icon),
        active: f.active,
        pix_key: isPix(f.name) ? t(f.pix_key) : null,
        pix_key_type: isPix(f.name) ? t(f.pix_key_type) : null,
        pix_receiver_name: isPix(f.name) ? t(f.pix_receiver_name) : null,
        pix_city: isPix(f.name) ? t(f.pix_city) : null,
      };
      if (f.id) {
        const { error } = await supabase.from("payment_methods").update(campos).eq("id", f.id);
        if (error) throw error;
      } else {
        const ordem = metodos.length ? Math.max(...metodos.map((m) => m.display_order)) + 1 : 0;
        const { error } = await supabase
          .from("payment_methods")
          .insert({ ...campos, barbershop_id: shop!.id, display_order: ordem });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Método salvo!");
      setForm(null);
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atualizar = useMutation({
    mutationFn: async (v: { id: string; active?: boolean; display_order?: number }) => {
      const { id, ...campos } = v;
      const { error } = await supabase.from("payment_methods").update(campos).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_methods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Método excluído.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function mover(i: number, dir: -1 | 1) {
    const a = metodos[i];
    const b = metodos[i + dir];
    if (!a || !b) return;
    atualizar.mutate({ id: a.id, display_order: b.display_order });
    atualizar.mutate({ id: b.id, display_order: a.display_order });
  }

  return (
    <AdminShell
      title="Métodos de pagamento"
      subtitle="Escolha quais formas de pagamento seus clientes poderão selecionar durante o agendamento."
      actions={
        <button className={btn} onClick={() => setForm(vazio)}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> ADICIONAR MÉTODO
          </span>
        </button>
      }
    >
      {form && (
        <form
          className="mb-8 grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate(form);
          }}
        >
          <label className="sm:col-span-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Nome do método</span>
            <input
              className={input}
              list="sugestoes-pagamento"
              placeholder="Pix, Dinheiro, Cartão de crédito..."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <datalist id="sugestoes-pagamento">
              {SUGESTOES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label className="sm:col-span-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Descrição (opcional)</span>
            <input
              className={input}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Ícone (opcional)</span>
            <input
              className={input}
              placeholder="pix, dinheiro, cartao..."
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-3 pt-6 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Método ativo (aparece para o cliente)
          </label>

          {isPix(form.name) && (
            <>
              <label>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Chave Pix (opcional)</span>
                <input
                  className={input}
                  value={form.pix_key}
                  onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
                />
              </label>
              <label>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Tipo da chave</span>
                <select
                  className={input}
                  value={form.pix_key_type}
                  onChange={(e) => setForm({ ...form, pix_key_type: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {TIPOS_PIX.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Nome do recebedor</span>
                <input
                  className={input}
                  value={form.pix_receiver_name}
                  onChange={(e) => setForm({ ...form, pix_receiver_name: e.target.value })}
                />
              </label>
              <label>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Cidade</span>
                <input
                  className={input}
                  value={form.pix_city}
                  onChange={(e) => setForm({ ...form, pix_city: e.target.value })}
                />
              </label>
            </>
          )}

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

      {isLoading ? (
        <Empty>Carregando...</Empty>
      ) : metodos.length === 0 ? (
        <Empty>
          Nenhum método de pagamento cadastrado.
          <div className="mt-4">
            <button className={btn} onClick={() => setForm(vazio)}>
              + ADICIONAR MÉTODO
            </button>
          </div>
        </Empty>
      ) : (
        <div className="space-y-3">
          {metodos.map((m, i) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4"
            >
              <div>
                <p className="font-display text-lg">
                  {m.name}{" "}
                  <span
                    className={`ml-2 rounded-full border px-2 py-0.5 text-[0.6rem] uppercase tracking-widest ${
                      m.active ? "border-primary/50 text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {m.active ? "Ativo" : "Inativo"}
                  </span>
                </p>
                {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                {m.pix_key && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pix {m.pix_key_type ? `(${m.pix_key_type})` : ""}: {m.pix_key}
                    {m.pix_receiver_name ? ` · ${m.pix_receiver_name}` : ""}
                    {m.pix_city ? ` · ${m.pix_city}` : ""}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button className={btnGhost} onClick={() => mover(i, -1)} aria-label="Subir">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button className={btnGhost} onClick={() => mover(i, 1)} aria-label="Descer">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  className={btnGhost}
                  onClick={() => atualizar.mutate({ id: m.id, active: !m.active })}
                >
                  {m.active ? "Desativar" : "Ativar"}
                </button>
                <button
                  className={btnGhost}
                  aria-label={`Editar ${m.name}`}
                  onClick={() =>
                    setForm({
                      id: m.id,
                      name: m.name,
                      description: m.description ?? "",
                      icon: m.icon ?? "",
                      active: m.active,
                      pix_key: m.pix_key ?? "",
                      pix_key_type: m.pix_key_type ?? "",
                      pix_receiver_name: m.pix_receiver_name ?? "",
                      pix_city: m.pix_city ?? "",
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className={`${btnGhost} hover:border-destructive hover:text-destructive`}
                  aria-label={`Excluir ${m.name}`}
                  onClick={() => excluir.mutate(m.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
