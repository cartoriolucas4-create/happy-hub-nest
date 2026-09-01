import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** WhatsApp comercial da plataforma usado como fallback até o Admin Geral definir o número. */
export const SUPORTE_WHATSAPP = "5511999999999";

export type LicenseStatus = "trial" | "active" | "expired" | "blocked" | "suspended";

export type Licenca = {
  status: LicenseStatus;
  access_type: "trial" | "paid_access" | "manual_access";
  trial_started_at: string;
  trial_expires_at: string;
  access_started_at: string | null;
  access_expires_at: string | null;
  expires_at: string;
  server_now: string;
};

export const STATUS_LICENCA: Record<LicenseStatus, string> = {
  trial: "TESTE",
  active: "ATIVO",
  expired: "EXPIRADO",
  blocked: "BLOQUEADO",
  suspended: "SUSPENSO",
};

export function statusLicencaClass(status: LicenseStatus) {
  switch (status) {
    case "trial":
      return "border-primary/40 bg-primary/10 text-primary";
    case "active":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
    case "blocked":
    case "suspended":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-secondary text-muted-foreground";
  }
}

export function useLicense() {
  return useQuery({
    queryKey: ["minha-licenca"],
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("minha_licenca");
      if (error) throw error;
      const row = (data as Licenca[] | null)?.[0] ?? null;
      return row;
    },
  });
}

/** WhatsApp atual da equipe, configurado no Admin Geral. */
export function useSupportWhatsapp() {
  return useQuery({
    queryKey: ["platform-support-whatsapp"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("support_whatsapp")
        .eq("id", "default")
        .maybeSingle();
      if (error) throw error;
      return data?.support_whatsapp || SUPORTE_WHATSAPP;
    },
  });
}

export function serverOffset(licenca: Licenca | null | undefined) {
  if (!licenca) return 0;
  return new Date(licenca.server_now).getTime() - Date.now();
}

export function restanteMs(expiresAt: string, offset = 0) {
  return new Date(expiresAt).getTime() - (Date.now() + offset);
}

export function partes(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    dias: Math.floor(total / 86400),
    horas: Math.floor((total % 86400) / 3600),
    minutos: Math.floor((total % 3600) / 60),
    segundos: total % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatarRestante(ms: number) {
  const p = partes(ms);
  const relogio = `${pad(p.horas)}:${pad(p.minutos)}:${pad(p.segundos)}`;
  return p.dias > 0 ? `${p.dias}d ${relogio}` : relogio;
}

export function useCountdown(expiresAt: string | null | undefined, offset = 0) {
  const [ms, setMs] = useState(() => (expiresAt ? restanteMs(expiresAt, offset) : 0));

  useEffect(() => {
    if (!expiresAt) return;
    setMs(restanteMs(expiresAt, offset));
    const t = setInterval(() => setMs(restanteMs(expiresAt, offset)), 1000);
    return () => clearInterval(t);
  }, [expiresAt, offset]);

  return ms;
}

export function dataHoraBr(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dataBr(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function whatsappSuporte(mensagem: string, numero = SUPORTE_WHATSAPP) {
  const digits = numero.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(mensagem)}`;
}

export function useIsSuperAdmin() {
  return useQuery({
    queryKey: ["is-super-admin"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: auth.user.id,
        _role: "super_admin",
      });
      if (error) throw error;
      return Boolean(data);
    },
  });
}
