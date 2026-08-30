import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Lock, Unlock, CalendarPlus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SuperShell, sBtn, sBtnGhost, sInput } from "@/components/superadmin/SuperShell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { STATUS_LICENCA, dataHoraBr, statusLicencaClass, type LicenseStatus } from "@/lib/license";

const FILTROS = [
  { valor: "todos", label: "Todos" },
  { valor: "trial", label: "Teste" },
  { valor: "active", label: "Ativos" },
  { valor: "expired", label: "Expirados" },
  { valor: "blocked", label: "Bloqueados" },
  { valor: "suspended", label: "Suspensos" },
] as const;
type Unidade = "dias" | "meses" | "anos";
type Acao = "bloquear" | "desbloquear" | "liberar" | null;

export const Route = createFileRoute("/_authenticated/super-admin/clientes/")({
  component: Clientes,
});

function Clientes() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [acao, setAcao] = useState<Acao>(null);
  const [quantidade, setQuantidade] = useState(30);
  const [unidade, setUnidade] = useState<Unidade>("dias");
  const [observacao, setObservacao] = useState("");
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["sa-clientes", busca, status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sa_clientes", {
        p_busca: busca,
        p_status: status,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
  const ids = useMemo(() => [...selecionados], [selecionados]);
  const allVisible = data.length > 0 && data.every((c) => selecionados.has(c.user_id));
  function refresh() {
    setSelecionados(new Set());
    queryClient.invalidateQueries({ queryKey: ["sa-clientes"] });
    queryClient.invalidateQueries({ queryKey: ["sa-stats"] });
    queryClient.invalidateQueries({ queryKey: ["sa-historico"] });
  }
  const executar = useMutation({
    mutationFn: async () => {
      if (acao === "bloquear") {
        const { error } = await supabase.rpc("sa_bloquear_clientes_massa", { p_user_ids: ids });
        if (error) throw error;
      }
      if (acao === "desbloquear") {
        const { error } = await supabase.rpc("sa_desbloquear_clientes_massa", { p_user_ids: ids });
        if (error) throw error;
      }
      if (acao === "liberar") {
        const { error } = await supabase.rpc("sa_liberar_acesso_massa", {
          p_user_ids: ids,
          p_quantidade: quantidade,
          p_unidade: unidade,
          ...(observacao.trim() ? { p_observacao: observacao.trim() } : {}),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Operação aplicada aos clientes selecionados.");
      setAcao(null);
      setObservacao("");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const title =
    acao === "bloquear"
      ? "Bloquear clientes"
      : acao === "desbloquear"
        ? "Desbloquear clientes"
        : "Liberar prazo";
  return (
    <SuperShell title="Painel da Plataforma" subtitle="Administração geral da plataforma">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente, e-mail ou barbearia"
            className={`${sInput} border-slate-600 bg-slate-950 pl-9`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setStatus(f.valor)}
              className={`rounded-full border px-3 py-1.5 text-xs ${status === f.valor ? "border-sky-400 bg-sky-400/15 text-sky-200" : "border-slate-600 text-slate-300"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {ids.length > 0 && (
        <div className="sticky top-3 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-sky-400/40 bg-slate-800 p-3 shadow-lg">
          <span className="text-sm font-medium">
            {ids.length} selecionado{ids.length !== 1 && "s"}
          </span>
          <button
            onClick={() => setAcao("bloquear")}
            className="rounded-md border border-red-400/70 px-3 py-2 text-xs text-red-200 hover:bg-red-500/10"
          >
            <Lock className="mr-1 inline h-3.5 w-3.5" />
            BLOQUEAR
          </button>
          <button onClick={() => setAcao("desbloquear")} className={sBtnGhost}>
            <Unlock className="mr-1 inline h-3.5 w-3.5" />
            DESBLOQUEAR
          </button>
          <button onClick={() => setAcao("liberar")} className={sBtn}>
            <CalendarPlus className="mr-1 inline h-3.5 w-3.5" />
            LIBERAR PRAZO
          </button>
          <button
            onClick={() => setSelecionados(new Set())}
            className="ml-auto text-xs text-slate-300 hover:text-white"
          >
            Limpar seleção
          </button>
        </div>
      )}
      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/60">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-700 bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={allVisible}
                  onCheckedChange={(checked) =>
                    setSelecionados(checked ? new Set(data.map((c) => c.user_id)) : new Set())
                  }
                  aria-label="Selecionar todos os clientes"
                />
              </th>
              <th className="px-3 py-3">Cliente</th>
              <th className="px-3 py-3">E-mail</th>
              <th className="px-3 py-3">Barbearia</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Tipo de acesso</th>
              <th className="px-3 py-3">Vencimento</th>
              <th className="px-3 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="p-5 text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan={8} className="p-5 text-slate-400">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {data.map((c) => (
              <tr
                key={c.user_id}
                className="border-b border-slate-800 last:border-0 hover:bg-slate-800/70"
              >
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selecionados.has(c.user_id)}
                    onCheckedChange={(checked) =>
                      setSelecionados((old) => {
                        const next = new Set(old);
                        if (checked) next.add(c.user_id);
                        else next.delete(c.user_id);
                        return next;
                      })
                    }
                    aria-label={`Selecionar ${c.nome || c.email}`}
                  />
                </td>
                <td className="px-3 py-3 font-medium text-slate-100">{c.nome || "Sem nome"}</td>
                <td className="px-3 py-3 text-slate-300">{c.email ?? "—"}</td>
                <td className="px-3 py-3 text-slate-300">{c.barbearia ?? "—"}</td>
                <td className="px-3 py-3">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs ${statusLicencaClass(c.status as LicenseStatus)}`}
                  >
                    {STATUS_LICENCA[c.status as LicenseStatus]}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-300">
                  {c.access_type === "trial" ? "Teste" : "Licença"}
                </td>
                <td className="px-3 py-3 text-slate-300">{dataHoraBr(c.vencimento)}</td>
                <td className="px-3 py-3">
                  <Link
                    to="/super-admin/clientes/$id"
                    params={{ id: c.user_id }}
                    className="text-sky-300 hover:text-sky-100"
                  >
                    <ExternalLink className="mr-1 inline h-3.5 w-3.5" />
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog
        open={acao !== null}
        onOpenChange={(open) => !open && !executar.isPending && setAcao(null)}
      >
        <DialogContent className="border-slate-600 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-slate-300">
              Você está prestes a aplicar esta ação a <strong>{ids.length}</strong> cliente
              {ids.length !== 1 && "s"}. Esta confirmação é obrigatória.
            </DialogDescription>
          </DialogHeader>
          {acao === "liberar" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Quantidade
                <input
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  className={`mt-1 ${sInput}`}
                />
              </label>
              <label>
                Unidade
                <select
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value as Unidade)}
                  className={`mt-1 ${sInput}`}
                >
                  <option value="dias">Dias</option>
                  <option value="meses">Meses</option>
                  <option value="anos">Anos</option>
                </select>
              </label>
              <label className="sm:col-span-2">
                Observação (opcional)
                <input
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className={`mt-1 ${sInput}`}
                />
              </label>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setAcao(null)}
              className={sBtnGhost}
              disabled={executar.isPending}
            >
              Cancelar
            </button>
            <button
              disabled={executar.isPending || (acao === "liberar" && quantidade <= 0)}
              onClick={() => executar.mutate()}
              className={
                acao === "bloquear"
                  ? "rounded-md bg-red-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                  : sBtn
              }
            >
              {executar.isPending ? "EXECUTANDO..." : "CONFIRMAR"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </SuperShell>
  );
}
