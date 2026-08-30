import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Mail, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SuperShell, sBtn, sBtnGhost, sInput } from "@/components/superadmin/SuperShell";
import {
  STATUS_LICENCA,
  dataBr,
  dataHoraBr,
  formatarRestante,
  restanteMs,
  statusLicencaClass,
  type LicenseStatus,
} from "@/lib/license";

type Unidade = "dias" | "meses" | "anos";

const ATALHOS: { label: string; quantidade: number; unidade: Unidade }[] = [
  { label: "30 dias", quantidade: 30, unidade: "dias" },
  { label: "60 dias", quantidade: 60, unidade: "dias" },
  { label: "90 dias", quantidade: 90, unidade: "dias" },
  { label: "6 meses", quantidade: 6, unidade: "meses" },
  { label: "1 ano", quantidade: 1, unidade: "anos" },
  { label: "2 anos", quantidade: 2, unidade: "anos" },
];

export const Route = createFileRoute("/_authenticated/super-admin/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Cliente | Super Admin" },
      { name: "description", content: "Controle de acesso, licença e histórico do cliente." },
      { property: "og:title", content: "Cliente | Super Admin" },
      { property: "og:description", content: "Detalhes da conta e liberação de acesso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClienteDetalhe,
});

function ClienteDetalhe() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [quantidade, setQuantidade] = useState(30);
  const [unidade, setUnidade] = useState<Unidade>("dias");
  const [observacao, setObservacao] = useState("");

  const { data: cliente, isLoading } = useQuery({
    queryKey: ["sa-cliente", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sa_cliente", { p_user_id: id });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const { data: historico } = useQuery({
    queryKey: ["sa-historico", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sa_historico", { p_user_id: id, p_limit: 50 });
      if (error) throw error;
      return data ?? [];
    },
  });

  function recarregar() {
    queryClient.invalidateQueries({ queryKey: ["sa-cliente", id] });
    queryClient.invalidateQueries({ queryKey: ["sa-historico", id] });
    queryClient.invalidateQueries({ queryKey: ["sa-clientes"] });
    queryClient.invalidateQueries({ queryKey: ["sa-stats"] });
  }

  const liberar = useMutation({
    mutationFn: async (p: { quantidade: number; unidade: Unidade }) => {
      const { data, error } = await supabase.rpc("sa_liberar_acesso", {
        p_user_id: id,
        p_quantidade: p.quantidade,
        p_unidade: p.unidade,
        p_observacao: observacao.trim() || null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (venc) => {
      toast.success(`Acesso liberado até ${dataHoraBr(venc)}`);
      setObservacao("");
      recarregar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bloquear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("sa_bloquear_acesso", {
        p_user_id: id,
        p_observacao: observacao.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acesso bloqueado.");
      setObservacao("");
      recarregar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const desbloquear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("sa_desbloquear_acesso", {
        p_user_id: id,
        p_observacao: observacao.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acesso desbloqueado.");
      setObservacao("");
      recarregar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const carregando = liberar.isPending || bloquear.isPending || desbloquear.isPending;
  const status = cliente?.status as LicenseStatus | undefined;
  const ms = cliente ? restanteMs(cliente.vencimento) : 0;
  const telefoneDigits = (cliente?.telefone ?? "").replace(/\D/g, "");

  return (
    <SuperShell
      title={cliente?.nome || "Cliente"}
      subtitle={cliente?.barbearia ?? "Sem barbearia cadastrada"}
      actions={
        <Link to="/super-admin/clientes" className={sBtnGhost}>
          <ArrowLeft className="mr-1 inline h-4 w-4" /> Voltar
        </Link>
      }
    >
      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {!isLoading && !cliente && <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>}

      {cliente && (
        <div className="space-y-8">
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-2xl">Cliente</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info label="Nome" value={cliente.nome || "—"} />
              <Info label="Barbearia" value={cliente.barbearia ?? "—"} />
              <Info label="E-mail" value={cliente.email ?? "—"} />
              <Info label="Telefone" value={cliente.telefone ?? "—"} />
              <Info label="Cadastro" value={dataBr(cliente.criado_em)} />
              <Info label="Meu link" value={cliente.slug ? `/barbearia/${cliente.slug}` : "—"} />
            </dl>
            <div className="mt-5 flex flex-wrap gap-3">
              {telefoneDigits.length >= 10 && (
                <a
                  href={`https://wa.me/55${telefoneDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={sBtnGhost}
                >
                  <MessageCircle className="mr-1 inline h-4 w-4" /> WhatsApp
                </a>
              )}
              {cliente.email && (
                <a href={`mailto:${cliente.email}`} className={sBtnGhost}>
                  <Mail className="mr-1 inline h-4 w-4" /> E-mail
                </a>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl">Controle de acesso</h2>
              {status && (
                <span className={`rounded-full border px-3 py-1 text-xs ${statusLicencaClass(status)}`}>
                  {STATUS_LICENCA[status]}
                </span>
              )}
            </div>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info label="Tipo de acesso" value={cliente.access_type === "trial" ? "Teste" : "Licença"} />
              <Info
                label="Data de início"
                value={dataHoraBr(cliente.access_started_at ?? cliente.trial_started_at)}
              />
              <Info label="Data de vencimento" value={dataHoraBr(cliente.vencimento)} />
              <Info label="Tempo restante" value={ms > 0 ? formatarRestante(ms) : "vencido"} />
            </dl>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Liberar acesso</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ATALHOS.map((a) => (
                  <button
                    key={a.label}
                    disabled={carregando}
                    onClick={() => liberar.mutate({ quantidade: a.quantidade, unidade: a.unidade })}
                    className="rounded-md border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary disabled:opacity-60"
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[120px_160px_1fr_auto] sm:items-end">
                <label className="block">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Quantidade</span>
                  <input
                    type="number"
                    min={1}
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                    className={`mt-2 ${sInput}`}
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Unidade</span>
                  <select
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value as Unidade)}
                    className={`mt-2 ${sInput}`}
                  >
                    <option value="dias">Dias</option>
                    <option value="meses">Meses</option>
                    <option value="anos">Anos</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Observação</span>
                  <input
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Ex.: pagamento realizado via WhatsApp"
                    className={`mt-2 ${sInput}`}
                  />
                </label>
                <button
                  disabled={carregando}
                  onClick={() => liberar.mutate({ quantidade, unidade })}
                  className={sBtn}
                >
                  LIBERAR ACESSO
                </button>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Conta ativa: o prazo é somado ao vencimento atual. Conta expirada ou bloqueada: o prazo
                começa agora.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {status === "blocked" || status === "suspended" ? (
                  <button disabled={carregando} onClick={() => desbloquear.mutate()} className={sBtn}>
                    DESBLOQUEAR
                  </button>
                ) : (
                  <button
                    disabled={carregando}
                    onClick={() => bloquear.mutate()}
                    className="rounded-md border border-destructive/50 px-5 py-2.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-60"
                  >
                    BLOQUEAR ACESSO
                  </button>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl">Histórico</h2>
            <div className="mt-4 space-y-3">
              {(historico ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma alteração registrada.</p>
              )}
              {(historico ?? []).map((h) => (
                <div key={h.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-sm tracking-widest text-primary">{h.acao}</p>
                    <span className="text-xs text-muted-foreground">{dataHoraBr(h.created_at)}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {h.novo_prazo ? `Prazo: ${h.novo_prazo} · ` : ""}
                    {h.vencimento_anterior ? `antes ${dataHoraBr(h.vencimento_anterior)} → ` : ""}
                    {h.novo_vencimento ? dataHoraBr(h.novo_vencimento) : ""}
                  </p>
                  {h.observacao && <p className="mt-1 text-xs">{h.observacao}</p>}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </SuperShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
