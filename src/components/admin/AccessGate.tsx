import { useQueryClient } from "@tanstack/react-query";
import { Clock, Lock, MessageCircle, ShieldCheck } from "lucide-react";
import { dataHoraBr, formatarRestante, serverOffset, useCountdown, useLicense, useSupportWhatsapp, whatsappSuporte, type Licenca } from "@/lib/license";

export function LicenseBanner() {
  const { data: licenca } = useLicense();
  const { data: supportWhatsapp } = useSupportWhatsapp();
  const offset = serverOffset(licenca);
  const ms = useCountdown(licenca?.expires_at, offset);

  if (!licenca || licenca.status === "expired" || licenca.status === "blocked" || licenca.status === "suspended") return null;

  const trial = licenca.status === "trial";
  const urgente = trial && ms < 2 * 60 * 60 * 1000;
  const aviso = !trial ? null : ms < 30 * 60 * 1000 ? "Seu período de teste termina em menos de 30 minutos." : ms < 2 * 60 * 60 * 1000 ? "Seu período de teste termina em menos de 2 horas." : "Entre em contato para continuar utilizando depois do teste.";

  const mensagem = `Olá, sou /${typeof window !== "undefined" ? window.location.pathname.split("/").filter(Boolean).pop() ?? "ID-DO-SITE" : "ID-DO-SITE"}, e tenho uma dúvida.`;

  return (
    <div className={`mb-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4 ${urgente ? "border-destructive/40 bg-destructive/10" : trial ? "border-primary/40 bg-primary/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
      <div className="flex items-start gap-3">
        {trial ? <Clock className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" /> : <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" aria-hidden="true" />}
        <div>
          <p className="font-display text-sm tracking-widest">{trial ? "TESTE GRATUITO" : "ACESSO ATIVO"}</p>
          <p className="mt-1 text-sm text-muted-foreground">{trial ? "Seu acesso gratuito termina em " : "Seu acesso está ativo até "}<strong className="text-foreground">{trial ? formatarRestante(ms) : dataHoraBr(licenca.expires_at)}</strong>{!trial && <>{" · tempo restante "}<strong className="text-foreground">{formatarRestante(ms)}</strong></>}</p>
          {aviso && <p className="mt-1 text-xs text-muted-foreground">{aviso}</p>}
        </div>
      </div>
      <a href={whatsappSuporte(mensagem, supportWhatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-xs tracking-widest hover:border-primary hover:text-primary">
        <MessageCircle className="h-4 w-4" aria-hidden="true" /> FALAR COM A EQUIPE
      </a>
    </div>
  );
}

export function AccessGate({ children }: { children: React.ReactNode }) {
  const { data: licenca, isLoading } = useLicense();
  const { data: supportWhatsapp } = useSupportWhatsapp();
  const queryClient = useQueryClient();
  if (isLoading) return <p className="text-sm text-muted-foreground">Verificando seu acesso...</p>;
  if (!licenca) return <>{children}</>;
  const bloqueado = licenca.status === "blocked" || licenca.status === "suspended";
  const expirado = licenca.status === "expired";
  if (!bloqueado && !expirado) return <>{children}</>;
  const mensagem = `Olá, sou /${typeof window !== "undefined" ? window.location.pathname.split("/").filter(Boolean).pop() ?? "ID-DO-SITE" : "ID-DO-SITE"}, e tenho uma dúvida.`;

  return (
    <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-8 text-center">
      <Lock className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
      <h2 className="mt-5 text-2xl">{bloqueado ? "ACESSO BLOQUEADO" : "SEU ACESSO EXPIROU"}</h2>
      <p className="mt-3 text-sm text-muted-foreground">{bloqueado ? "Seu acesso está temporariamente bloqueado. Entre em contato com o suporte." : licenca.access_expires_at ? "Seu período de acesso terminou. Entre em contato para renovar." : "Seu período gratuito de 24 horas terminou. Para continuar utilizando o sistema, entre em contato com nossa equipe para ativar seu acesso."}</p>
      <p className="mt-3 text-xs text-muted-foreground">Nenhum dado da sua barbearia foi excluído. Ao liberarmos o acesso, tudo continua disponível.</p>
      <p className="mt-1 text-xs text-muted-foreground">Venceu em {dataHoraBr(licenca.expires_at)}</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <a href={whatsappSuporte(mensagem, supportWhatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-display text-sm tracking-widest text-primary-foreground hover:bg-primary/90"><MessageCircle className="h-4 w-4" aria-hidden="true" />{expirado && licenca.access_expires_at ? "RENOVAR ACESSO" : "ENTRAR EM CONTATO"}</a>
        <button onClick={() => queryClient.invalidateQueries()} className="rounded-md border border-border px-5 py-3 text-sm hover:border-primary hover:text-primary">Já liberei, atualizar</button>
      </div>
    </div>
  );
}

export type { Licenca };