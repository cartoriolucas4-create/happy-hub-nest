import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Cloud, Database, Download, History, RefreshCw, ShieldCheck } from "lucide-react";
import { SuperShell } from "@/components/superadmin/SuperShell";

export const Route = createFileRoute("/_authenticated/super-admin/backups" as any)({
  head: () => ({
    meta: [
      { title: "Backups e proteção de dados | Super Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Backups,
});

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-5">
      <Icon className="h-5 w-5 text-sky-300" aria-hidden="true" />
      <p className="mt-3 text-xs uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Backups() {
  return (
    <SuperShell title="Backups e proteção de dados" subtitle="Central de cópias de segurança da plataforma e dos clientes">
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
          <div>
            <h2 className="font-semibold text-amber-100">Backup automático ainda não está conectado</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Esta tela já está disponível no Administrador Geral, mas nenhum backup foi criado ou enviado ao Google Drive.
              A integração precisa ser configurada no servidor e validada com um teste real de restauração antes de ser ativada.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Database} label="Banco de dados" value="Aguardando conexão" />
        <Metric icon={Cloud} label="Google Drive" value="Não configurado" />
        <Metric icon={History} label="Último backup" value="Nenhum registrado" />
        <Metric icon={ShieldCheck} label="Restauração testada" value="Pendente" />
      </div>

      <section className="mt-8 rounded-xl border border-slate-700 bg-slate-900/60 p-5">
        <h2 className="text-xl font-semibold">Configuração necessária no servidor</h2>
        <p className="mt-2 text-sm text-slate-400">
          As credenciais devem ficar exclusivamente nos Secrets do Supabase/ambiente de servidor. Nunca devem ser colocadas no navegador,
          no código-fonte ou nesta tela.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            ["SUPABASE_ACCESS_TOKEN", "Token de acesso à API de gerenciamento do Supabase"],
            ["GOOGLE_DRIVE_CLIENT_ID", "Aplicativo OAuth do Google"],
            ["GOOGLE_DRIVE_CLIENT_SECRET", "Segredo OAuth do Google"],
            ["GOOGLE_DRIVE_REFRESH_TOKEN", "Autorização de longa duração para o Drive"],
            ["GOOGLE_DRIVE_FOLDER_ID", "Pasta de destino dos arquivos de backup"],
            ["BACKUP_ENCRYPTION_KEY", "Chave forte para criptografar os arquivos"],
          ].map(([name, description]) => (
            <div key={name} className="rounded-lg border border-slate-700 bg-[#101923] p-3">
              <code className="text-xs text-sky-200">{name}</code>
              <p className="mt-1 text-xs text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-5">
        <h2 className="text-xl font-semibold">Política planejada</h2>
        <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
          <div className="rounded-lg bg-[#101923] p-4">
            <p className="font-medium text-slate-100">Frequência</p>
            <p className="mt-1">Backup diário automático, após configuração e validação.</p>
          </div>
          <div className="rounded-lg bg-[#101923] p-4">
            <p className="font-medium text-slate-100">Retenção</p>
            <p className="mt-1">Meta inicial de 90 cópias diárias, sujeita ao espaço disponível.</p>
          </div>
          <div className="rounded-lg bg-[#101923] p-4">
            <p className="font-medium text-slate-100">Escopo</p>
            <p className="mt-1">Banco, arquivos e imagens, com restauração isolada e trilha de auditoria.</p>
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 p-4 text-sm text-slate-400">
        <Download className="h-4 w-4" aria-hidden="true" />
        <span>Gerar backup e restaurar ficarão disponíveis somente depois que a rotina do servidor estiver configurada e testada.</span>
        <span className="ml-auto inline-flex items-center gap-2 rounded-md border border-slate-600 px-3 py-2 text-xs">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Aguardando configuração
        </span>
      </div>
    </SuperShell>
  );
}
