import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, CalendarClock, Minus, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { sBtn, sBtnGhost, sInput } from "@/components/superadmin/SuperShell";
import { STATUS_LICENCA, dataHoraBr, formatarRestante, restanteMs, statusLicencaClass, type LicenseStatus } from "@/lib/license";

type Unidade = "dias" | "meses" | "anos";
type Acao = "adicionar" | "remover" | "definir" | "encerrar" | null;

type ClienteAcesso = {
  user_id: string;
  nome: string | null;
  access_type: string;
  status: LicenseStatus;
  access_started_at: string | null;
  trial_started_at: string;
  vencimento: string;
};

/**
 * Chama o RPC mantendo o cliente Supabase como `this`. Extrair `supabase.rpc`
 * para uma constante quebra o binding interno (erro "reading 'rest'").
 */
async function rpc(
  fn: string,
  args: Record<string, unknown>,
): Promise<{ data: unknown; error: { message: string } | null }> {
  const client = supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{
      data: unknown;
      error: { message: string } | null;
    }>;
  };
  const response = await client.rpc(fn, args);
  if (!response) throw new Error("Não foi possível concluir a alteração de acesso.");
  return response;
}

export function ControlePrazoAcesso({ cliente, onChanged }: { cliente: ClienteAcesso; onChanged: () => void }) {
  const [acao, setAcao] = useState<Acao>(null);
  const [quantidade, setQuantidade] = useState(30);
  const [unidade, setUnidade] = useState<Unidade>("dias");
  const [vencimento, setVencimento] = useState(() => toDateTimeLocal(cliente.vencimento));
  const [observacao, setObservacao] = useState("");

  const executar = useMutation({
    mutationFn: async () => {
      let fn = "";
      let args: Record<string, unknown> = { p_user_id: cliente.user_id };
      if (acao === "adicionar") {
        fn = "sa_liberar_acesso";
        args = { ...args, p_quantidade: quantidade, p_unidade: unidade, ...(observacao.trim() ? { p_observacao: observacao.trim() } : {}) };
      } else if (acao === "remover") {
        fn = "sa_remover_tempo_acesso";
        args = { ...args, p_quantidade: quantidade, p_unidade: unidade, ...(observacao.trim() ? { p_observacao: observacao.trim() } : {}) };
      } else if (acao === "definir") {
        if (!vencimento) throw new Error("Informe a data e o horário de vencimento.");
        fn = "sa_definir_vencimento";
        args = { ...args, p_vencimento: new Date(vencimento).toISOString(), ...(observacao.trim() ? { p_observacao: observacao.trim() } : {}) };
      } else if (acao === "encerrar") {
        fn = "sa_encerrar_acesso";
        args = { ...args, ...(observacao.trim() ? { p_observacao: observacao.trim() } : {}) };
      } else {
        throw new Error("Ação inválida.");
      }
      const { data, error } = await rpc(fn, args);
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: () => {
      toast.success(acao === "encerrar" ? "Acesso encerrado." : "Prazo atualizado com sucesso.");
      setAcao(null);
      setObservacao("");
      onChanged();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const ms = restanteMs(cliente.vencimento);
  const restante = ms > 0 ? formatarRestante(ms) : "expirado";
  const bloqueado = cliente.status === "blocked" || cliente.status === "suspended";

  function abrir(next: Exclude<Acao, null>) {
    setAcao(next);
    setVencimento(toDateTimeLocal(cliente.vencimento));
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl">Controle de acesso</h2>
          <p className="mt-1 text-sm text-muted-foreground">Controle administrativo do prazo, separado de bloqueio e desbloqueio.</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs ${statusLicencaClass(cliente.status)}`}>
          {STATUS_LICENCA[cliente.status]}
        </span>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Status atual" value={STATUS_LICENCA[cliente.status]} />
        <Info label="Tipo de licença" value={cliente.access_type === "trial" ? "Teste" : "Licença"} />
        <Info label="Data de início" value={dataHoraBr(cliente.access_started_at ?? cliente.trial_started_at)} />
        <Info label="Data de vencimento" value={dataHoraBr(cliente.vencimento)} />
        <Info label="Tempo restante" value={restante} />
        <Info label="Expirado" value={ms <= 0 ? "Sim" : "Não"} />
        <Info label="Bloqueado" value={bloqueado ? "Sim" : "Não"} />
      </dl>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button onClick={() => abrir("adicionar")} disabled={executar.isPending} className={sBtn}>
          <Plus className="mr-1 inline h-4 w-4" /> Adicionar tempo
        </button>
        <button onClick={() => abrir("remover")} disabled={executar.isPending} className="rounded-md border border-amber-500/60 px-4 py-2.5 text-sm text-amber-300 hover:bg-amber-500/10 disabled:opacity-60">
          <Minus className="mr-1 inline h-4 w-4" /> Remover tempo
        </button>
        <button onClick={() => abrir("definir")} disabled={executar.isPending} className={sBtnGhost}>
          <CalendarClock className="mr-1 inline h-4 w-4" /> Definir vencimento
        </button>
        <button onClick={() => abrir("encerrar")} disabled={executar.isPending} className="rounded-md border border-destructive/60 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-60">
          <XCircle className="mr-1 inline h-4 w-4" /> Encerrar acesso
        </button>
      </div>

      {bloqueado && (
        <p className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
          Alterar o prazo não desbloqueia este cliente. Use a ação de desbloqueio existente somente quando essa for a operação desejada.
        </p>
      )}

      <Dialog open={acao !== null} onOpenChange={(open) => !open && !executar.isPending && setAcao(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tituloAcao(acao)}</DialogTitle>
            <DialogDescription>
              {acao === "encerrar" ? "Você está prestes a encerrar o acesso deste cliente. A confirmação é obrigatória." : "A alteração será executada no servidor e registrada no histórico administrativo."}
            </DialogDescription>
          </DialogHeader>

          {acao === "adicionar" || acao === "remover" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Quantidade
                <input type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} className={`mt-1 ${sInput}`} />
              </label>
              <label>
                Unidade
                <select value={unidade} onChange={(e) => setUnidade(e.target.value as Unidade)} className={`mt-1 ${sInput}`}>
                  <option value="dias">Dias</option>
                  <option value="meses">Meses</option>
                  <option value="anos">Anos</option>
                </select>
              </label>
            </div>
          ) : acao === "definir" ? (
            <label>
              Vencimento do acesso
              <input type="datetime-local" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className={`mt-1 ${sInput}`} />
              <span className="mt-1 block text-xs text-muted-foreground">Você pode escolher uma data anterior ou posterior ao vencimento atual.</span>
            </label>
          ) : acao === "encerrar" ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-medium">{cliente.nome || "Cliente"}</p>
              <p className="mt-1 text-muted-foreground">Vencimento atual: {dataHoraBr(cliente.vencimento)}</p>
              <p className="mt-1 text-destructive">Novo estado: acesso encerrado/expirado.</p>
            </div>
          ) : null}

          {acao && (
            <label className="block">
              Observação (opcional)
              <input value={observacao} onChange={(e) => setObservacao(e.target.value)} className={`mt-1 ${sInput}`} placeholder="Motivo administrativo" />
            </label>
          )}

          {acao === "encerrar" && (
            <p className="flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Esta ação encerra o prazo imediatamente. O desbloqueio continua sendo uma operação separada.
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button className={sBtnGhost} onClick={() => setAcao(null)} disabled={executar.isPending}>Cancelar</button>
            <button
              className={acao === "remover" || acao === "encerrar" ? "rounded-md bg-destructive px-5 py-2.5 text-sm font-medium text-destructive-foreground disabled:opacity-60" : sBtn}
              disabled={executar.isPending || ((acao === "adicionar" || acao === "remover") && quantidade <= 0) || (acao === "definir" && !vencimento)}
              onClick={() => executar.mutate()}
            >
              {executar.isPending ? "EXECUTANDO..." : acao === "encerrar" ? "CONFIRMAR ENCERRAMENTO" : "CONFIRMAR ALTERAÇÃO"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt><dd className="mt-1 text-sm">{value}</dd></div>;
}

function tituloAcao(acao: Acao) {
  if (acao === "adicionar") return "Adicionar tempo";
  if (acao === "remover") return "Remover tempo";
  if (acao === "definir") return "Definir vencimento";
  if (acao === "encerrar") return "Encerrar acesso";
  return "Controle de acesso";
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
