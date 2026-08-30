import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sBtn, sInput } from "@/components/superadmin/SuperShell";

function Campo({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`mt-2 ${sInput}`}
      />
    </label>
  );
}

/** Edição dos dados de contato da conta do cliente. */
export function EditarContato({
  userId,
  nome,
  email,
  telefone,
  onSaved,
}: {
  userId: string;
  nome: string;
  email: string;
  telefone: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ nome, email, telefone });

  useEffect(() => {
    setForm({ nome, email, telefone });
  }, [nome, email, telefone]);

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("sa_atualizar_cliente", {
        p_user_id: userId,
        p_nome: form.nome,
        p_email: form.email,
        p_telefone: form.telefone,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados do cliente atualizados.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-2xl">Editar dados do cliente</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Campo label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} />
        <Campo label="E-mail" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Campo
          label="Telefone"
          value={form.telefone}
          onChange={(v) => setForm({ ...form, telefone: v })}
        />
      </div>
      <button disabled={salvar.isPending} onClick={() => salvar.mutate()} className={`mt-5 ${sBtn}`}>
        {salvar.isPending ? "SALVANDO..." : "SALVAR DADOS"}
      </button>
    </section>
  );
}

const CAMPOS_SHOP = [
  ["nome", "Nome da barbearia"],
  ["slug", "Link (slug)"],
  ["telefone", "Telefone"],
  ["whatsapp", "WhatsApp"],
  ["email", "E-mail"],
  ["slogan", "Slogan"],
  ["endereco", "Rua"],
  ["numero", "Número"],
  ["bairro", "Bairro"],
  ["cidade", "Cidade"],
  ["estado", "Estado"],
  ["cep", "CEP"],
  ["instagram", "Instagram"],
] as const;

type ShopForm = Record<(typeof CAMPOS_SHOP)[number][0] | "descricao", string>;

const VAZIO: ShopForm = {
  nome: "",
  slug: "",
  telefone: "",
  whatsapp: "",
  email: "",
  slogan: "",
  endereco: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  instagram: "",
  descricao: "",
};

/** Edição completa da barbearia do cliente + exclusão da conta. */
export function EditarBarbearia({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<ShopForm>(VAZIO);
  const [confirmar, setConfirmar] = useState("");

  const { data: shop, isLoading } = useQuery({
    queryKey: ["sa-shop", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbershops")
        .select("*")
        .eq("owner_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!shop) return;
    const next = { ...VAZIO };
    for (const k of Object.keys(VAZIO) as (keyof ShopForm)[]) {
      next[k] = (shop as Record<string, unknown>)[k]?.toString() ?? "";
    }
    setForm(next);
  }, [shop]);

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("sa_atualizar_barbearia", {
        p_user_id: userId,
        p_nome: form.nome,
        p_slug: form.slug,
        p_telefone: form.telefone,
        p_whatsapp: form.whatsapp,
        p_email: form.email,
        p_endereco: form.endereco,
        p_numero: form.numero,
        p_bairro: form.bairro,
        p_cidade: form.cidade,
        p_estado: form.estado,
        p_cep: form.cep,
        p_instagram: form.instagram,
        p_slogan: form.slogan,
        p_descricao: form.descricao,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Barbearia atualizada.");
      queryClient.invalidateQueries({ queryKey: ["sa-shop", userId] });
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("sa_excluir_cliente", { p_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente excluído.");
      queryClient.invalidateQueries({ queryKey: ["sa-clientes"] });
      queryClient.invalidateQueries({ queryKey: ["sa-stats"] });
      navigate({ to: "/super-admin/clientes", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-2xl">Editar barbearia</h2>
        {isLoading && <p className="mt-3 text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && !shop && (
          <p className="mt-3 text-sm text-muted-foreground">
            Este cliente ainda não cadastrou a barbearia.
          </p>
        )}
        {shop && (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CAMPOS_SHOP.map(([key, label]) => (
                <Campo
                  key={key}
                  label={label}
                  value={form[key]}
                  onChange={(v) => setForm({ ...form, [key]: v })}
                />
              ))}
            </div>
            <label className="mt-4 block">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Descrição</span>
              <textarea
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className={`mt-2 ${sInput}`}
              />
            </label>
            <button
              disabled={salvar.isPending}
              onClick={() => salvar.mutate()}
              className={`mt-5 ${sBtn}`}
            >
              {salvar.isPending ? "SALVANDO..." : "SALVAR BARBEARIA"}
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              Campos deixados em branco mantêm o valor atual. O link deve ser único na plataforma.
            </p>
          </>
        )}
      </section>

      <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <h2 className="text-2xl text-destructive">Excluir cliente</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Remove a barbearia e todos os dados dela (agendamentos, serviços, barbeiros, clientes,
          galeria). Esta ação não pode ser desfeita. Digite <strong>EXCLUIR</strong> para confirmar.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <input
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            placeholder="EXCLUIR"
            className={`${sInput} max-w-[200px]`}
          />
          <button
            disabled={confirmar.trim().toUpperCase() !== "EXCLUIR" || excluir.isPending}
            onClick={() => excluir.mutate()}
            className="rounded-md border border-destructive bg-destructive/10 px-5 py-2.5 text-sm text-destructive hover:bg-destructive/20 disabled:opacity-50"
          >
            <Trash2 className="mr-1 inline h-4 w-4" />
            {excluir.isPending ? "EXCLUINDO..." : "EXCLUIR CLIENTE"}
          </button>
        </div>
      </section>
    </>
  );
}
