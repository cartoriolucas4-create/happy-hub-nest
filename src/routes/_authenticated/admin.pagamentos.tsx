import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown, Pencil, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, Empty, btn, btnGhost, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/admin/pagamentos")({
  head: () => ({
    meta: [
      { title: "Meios de pagamento | BarberFlow" },
      { name: "description", content: "Configure os meios de pagamento aceitos pela sua barbearia." },
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
  pix_beneficiary: string | null;
};

type Form = {
  id: string | null;
  name: string;
  description: string;
  icon: string;
  active: boolean;
  pix_key: string;
  pix_beneficiary: string;
};

const vazio: Form = { id: null, name: "", description: "", icon: "", active: true, pix_key: "", pix_beneficiary: "" };
const DEFAULT_PAYMENTS = [
  { name: "DINHEIRO", icon: "💵" },
  { name: "CARTÃO CRÉDITO", icon: "💳" },
  { name: "CARTÃO DÉBITO", icon: "💳" },
  { name: "PIX", icon: "PIX" },
];

function isPix(name: string) {
  return name.trim().toLowerCase() === "pix";
}

async function ensureDefaultPayments(shopId: string) {
  const { data, error } = await supabase.from("payment_methods").select("id,name").eq("barbershop_id", shopId).order("display_order");
  if (error) throw error;
  if ((data ?? []).length > 0) return;
  const { error: insertError } = await supabase.from("payment_methods").insert(
    DEFAULT_PAYMENTS.map((item, index) => ({ barbershop_id: shopId, name: item.name, icon: item.icon, description: null, active: true, display_order: index })),
  );
  if (insertError) throw insertError;
}

function Pagamentos() {
  const { data: shop } = useShop();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);

  const { data: metodos = [], isLoading } = useQuery({
    queryKey: ["payment-methods-admin", shop?.id],
    enabled: Boolean(shop?.id),
    queryFn: async () => {
      await ensureDefaultPayments(shop!.id);
      const { data, error } = await supabase.from("payment_methods").select("*").eq("barbershop_id", shop!.id).order("display_order").order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as Metodo[];
    },
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["payment-methods-admin"] });
    qc.invalidateQueries({ queryKey: ["payment-methods"] });
    qc.invalidateQueries({ queryKey: ["base-agendamentos"] });
  };

  const salvar = useMutation({
    mutationFn: async (f: Form) => {
      if (f.name.trim().length < 2) throw new Error("Informe o nome do meio de pagamento.");
      if (isPix(f.name) && f.pix_key.trim() && f.pix_beneficiary.trim().length < 2) throw new Error("Informe o nome do beneficiário do Pix.");
      const campos = {
        name: f.name.trim(),
        description: f.description.trim() || null,
        icon: f.icon.trim() || null,
        active: f.active,
        pix_key: isPix(f.name) ? f.pix_key.trim() || null : null,
        pix_beneficiary: isPix(f.name) ? f.pix_beneficiary.trim() || null : null,
      };
      if (f.id) {
        const { error } = await supabase.from("payment_methods").update(campos as any).eq("id", f.id);
        if (error) throw error;
      } else {
        const ordem = metodos.length ? Math.max(...metodos.map((m) => m.display_order)) + 1 : 0;
        const { error } = await supabase.from("payment_methods").insert({ ...campos, barbershop_id: shop!.id, display_order: ordem } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Meio de pagamento salvo!"); setForm(null); invalidar(); },
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
    onSuccess: () => { toast.success("Meio de pagamento excluído."); invalidar(); },
    onError: (e: Error) => toast.error(e.message),
  });

  function mover(i: number, dir: -1 | 1) {
    const a = metodos[i];
    const b = metodos[i + dir];
    if (!a || !b) return;
    atualizar.mutate({ id: a.id, display_order: b.display_order });
    atualizar.mutate({ id: b.id, display_order: a.display_order });
  }

  async function copiar(texto: string) {
    try { await navigator.clipboard.writeText(texto); toast.success("Chave Pix copiada!"); }
    catch { toast.error("Não foi possível copiar automaticamente."); }
  }

  return (
    <AdminShell
      title="Meios de pagamento"
      subtitle="Dinheiro, cartões e Pix já ficam disponíveis por padrão. Você pode personalizar, desativar ou excluir qualquer opção."
      actions={<button className={btn} onClick={() => setForm(vazio)}><span className="flex items-center gap-2"><Plus className="h-4 w-4" /> ADICIONAR MEIO DE PAGAMENTO</span></button>}
    >
      {form && (
        <form className="mb-8 grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); salvar.mutate(form); }}>
          <label className="sm:col-span-2"><span className="text-xs uppercase tracking-widest text-muted-foreground">Nome do meio de pagamento *</span><input className={input} placeholder="Ex.: Pix, Vale, Link de pagamento..." maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label className="sm:col-span-2"><span className="text-xs uppercase tracking-widest text-muted-foreground">Descrição (opcional)</span><input className={input} maxLength={160} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label><span className="text-xs uppercase tracking-widest text-muted-foreground">Ícone (opcional)</span><input className={input} placeholder="Ex.: 💳 ou PIX" maxLength={40} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></label>
          <label className="flex items-center gap-3 pt-6 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Ativo (aparece para o cliente)</label>
          {isPix(form.name) && <div className="sm:col-span-2 rounded-lg border border-primary/30 bg-primary/5 p-4"><p className="text-sm font-semibold text-primary">Configuração do Pix</p><p className="mt-1 text-xs text-muted-foreground">Opcional. Se preenchida, o cliente poderá copiar a chave em um clique no Meu Link.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className="text-xs uppercase tracking-widest text-muted-foreground">Nome do beneficiário</span><input className={input + " mt-1"} placeholder="Ex.: João da Silva" value={form.pix_beneficiary} onChange={(e) => setForm({ ...form, pix_beneficiary: e.target.value })} /></label><label><span className="text-xs uppercase tracking-widest text-muted-foreground">Chave Pix</span><input className={input + " mt-1"} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" value={form.pix_key} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} /></label></div></div>}
          <div className="flex gap-2 sm:col-span-2"><button className={btn} disabled={salvar.isPending}>{salvar.isPending ? "SALVANDO..." : "SALVAR"}</button><button type="button" className={btnGhost} onClick={() => setForm(null)}>Cancelar</button></div>
        </form>
      )}

      {isLoading ? <Empty>Carregando...</Empty> : metodos.length === 0 ? <Empty>Nenhum meio de pagamento cadastrado.</Empty> : (
        <div className="space-y-3">
          {metodos.map((m, i) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
              <div className="min-w-0"><p className="font-display text-lg">{m.icon ? `${m.icon} ` : ""}{m.name} <span className={`ml-2 rounded-full border px-2 py-0.5 text-[0.6rem] uppercase tracking-widest ${m.active ? "border-primary/50 text-primary" : "border-border text-muted-foreground"}`}>{m.active ? "Ativo" : "Inativo"}</span></p>{m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}{isPix(m.name) && (m.pix_key || m.pix_beneficiary) && <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs"><p><span className="text-muted-foreground">Beneficiário:</span> {m.pix_beneficiary || "Não informado"}</p>{m.pix_key && <p className="mt-1 flex flex-wrap items-center gap-2"><span><span className="text-muted-foreground">Chave:</span> {m.pix_key}</span><button type="button" className="inline-flex items-center gap-1 text-primary hover:underline" onClick={() => copiar(m.pix_key!)}><Copy className="h-3 w-3" />Copiar</button></p>}</div>}</div>
              <div className="flex flex-wrap items-center gap-2"><button className={btnGhost} onClick={() => mover(i, -1)} aria-label="Subir"><ArrowUp className="h-4 w-4" /></button><button className={btnGhost} onClick={() => mover(i, 1)} aria-label="Descer"><ArrowDown className="h-4 w-4" /></button><button className={btnGhost} onClick={() => atualizar.mutate({ id: m.id, active: !m.active })}>{m.active ? "Desativar" : "Ativar"}</button><button className={btnGhost} aria-label={`Editar ${m.name}`} onClick={() => setForm({ id: m.id, name: m.name, description: m.description ?? "", icon: m.icon ?? "", active: m.active, pix_key: m.pix_key ?? "", pix_beneficiary: m.pix_beneficiary ?? "" })}><Pencil className="h-4 w-4" /></button><button className={`${btnGhost} hover:border-destructive hover:text-destructive`} aria-label={`Excluir ${m.name}`} onClick={() => excluir.mutate(m.id)}><Trash2 className="h-4 w-4" /></button></div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
