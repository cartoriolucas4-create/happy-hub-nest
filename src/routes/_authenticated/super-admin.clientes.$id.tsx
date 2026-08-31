import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { SuperShell, sBtn, sBtnGhost, sInput } from "@/components/superadmin/SuperShell";
import { EditarBarbearia, EditarContato } from "@/components/superadmin/EditarCliente";
import { ControlePrazoAcesso } from "@/components/superadmin/ControlePrazoAcesso";
import { dataBr, dataHoraBr, type LicenseStatus } from "@/lib/license";

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
  const [observacao, setObservacao] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [confirmarTroca, setConfirmarTroca] = useState(false);

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

  const bloquear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("sa_bloquear_acesso", {
        p_user_id: id,
        ...(observacao.trim() ? { p_observacao: observacao.trim() } : {}),
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
        ...(observacao.trim() ? { p_observacao: observacao.trim() } : {}),
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

  const trocarSenha = useMutation({
    mutationFn: async () => {
      if (novaSenha.length < 8) throw new Error("A senha deve ter pelo menos 8 caracteres.");
      if (novaSenha !== confirmarSenha) throw new Error("As senhas não conferem.");
      const { error } = await supabase.functions.invoke("admin-change-password", {
        body: { userId: id, password: novaSenha },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Senha alterada com segurança.");
      setNovaSenha("");
      setConfirmarSenha("");
      setConfirmarTroca(false);
      setPasswordOpen(false);
      recarregar();
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível alterar a senha."),
  });

  const carregandoBloqueio = bloquear.isPending || desbloquear.isPending;
  const status = cliente?.status as LicenseStatus | undefined;
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
                <a href={`https://wa.me/55${telefoneDigits}`} target="_blank" rel="noopener noreferrer" className={sBtnGhost}>
                  <MessageCircle className="mr-1 inline h-4 w-4" /> WhatsApp
                </a>
              )}
              {cliente.email && <a href={`mailto:${cliente.email}`} className={sBtnGhost}><Mail className="mr-1 inline h-4 w-4" /> E-mail</a>}
              <button onClick={() => setPasswordOpen(true)} className={sBtnGhost}><KeyRound className="mr-1 inline h-4 w-4" /> Trocar senha</button>
            </div>
          </section>

          <EditarContato
            userId={id}
            nome={cliente.nome ?? ""}
            email={cliente.email ?? ""}
            telefone={cliente.telefone ?? ""}
            onSaved={recarregar}
          />

          <EditarBarbearia userId={id} onSaved={recarregar} />

          <ControlePrazoAcesso
            cliente={{
              user_id: cliente.user_id,
              nome: cliente.nome,
              access_type: cliente.access_type,
              status: cliente.status as LicenseStatus,
              access_started_at: cliente.access_started_at,
              trial_started_at: cliente.trial_started_at,
              vencimento: cliente.vencimento,
            }}
            onChanged={recarregar}
          />

          <section className="rounded-lg border border-border bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl">Bloqueio de acesso</h2>
                <p className="mt-1 text-sm text-muted-foreground">Bloqueio é separado da expiração e da alteração de prazo.</p>
              </div>
              {status === "blocked" || status === "suspended" ? (
                <button disabled={carregandoBloqueio} onClick={() => desbloquear.mutate()} className={sBtn}>DESBLOQUEAR</button>
              ) : (
                <button disabled={carregandoBloqueio} onClick={() => bloquear.mutate()} className="rounded-md border border-destructive/50 px-5 py-2.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-60">BLOQUEAR ACESSO</button>
              )}
            </div>
            <label className="mt-5 block">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Observação</span>
              <input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Motivo administrativo" className={`mt-2 ${sInput}`} />
            </label>
          </section>

          <section>
            <h2 className="text-2xl">Histórico</h2>
            <div className="mt-4 space-y-3">
              {(historico ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma alteração registrada.</p>}
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

      <Dialog open={passwordOpen} onOpenChange={(open) => { if (!trocarSenha.isPending) setPasswordOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar senha do cliente</DialogTitle>
            <DialogDescription>A senha é enviada somente para a função administrativa segura e não é armazenada no histórico.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm">Nova senha</span>
              <div className="relative">
                <input type={mostrarSenha ? "text" : "password"} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoComplete="new-password" className={`mt-1 ${sInput}`} />
                <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-3 text-muted-foreground" aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}>
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="block">
              <span className="text-sm">Confirmar nova senha</span>
              <input type={mostrarSenha ? "text" : "password"} value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} autoComplete="new-password" className={`mt-1 ${sInput}`} />
            </label>
            <p className="text-xs text-muted-foreground">Use ao menos 8 caracteres. Confirme a alteração antes de continuar.</p>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={confirmarTroca} onChange={(e) => setConfirmarTroca(e.target.checked)} className="mt-1" />
              Confirmo que desejo alterar a senha deste cliente.
            </label>
            <div className="flex justify-end gap-3">
              <button className={sBtnGhost} onClick={() => setPasswordOpen(false)} disabled={trocarSenha.isPending}>Cancelar</button>
              <button className={sBtn} disabled={trocarSenha.isPending || novaSenha.length < 8 || novaSenha !== confirmarSenha || !confirmarTroca} onClick={() => trocarSenha.mutate()}>
                {trocarSenha.isPending ? "ALTERANDO..." : "CONFIRMAR ALTERAÇÃO"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SuperShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt><dd className="mt-1 text-sm">{value}</dd></div>;
}
