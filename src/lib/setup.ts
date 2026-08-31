import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SetupItemKey = "dias" | "barbeiros" | "servicos" | "horarios" | "pagamentos";
export type SetupItem = { key: SetupItemKey; label: string; descricao: string; to: string; ok: boolean };

type BusinessHour = {
  dia_semana: number;
  aberto: boolean;
  hora_inicio: string | null;
  hora_fim: string | null;
  intervalo_inicio: string | null;
  intervalo_fim: string | null;
};

export function isValidHourRange(h: BusinessHour) {
  if (!h.aberto || !h.hora_inicio || !h.hora_fim) return false;
  if (h.hora_fim <= h.hora_inicio) return false;
  const hasIntervalStart = Boolean(h.intervalo_inicio);
  const hasIntervalEnd = Boolean(h.intervalo_fim);
  if (hasIntervalStart !== hasIntervalEnd) return false;
  if (hasIntervalStart && hasIntervalEnd) {
    if (h.intervalo_fim! <= h.intervalo_inicio!) return false;
    if (h.intervalo_inicio! < h.hora_inicio || h.intervalo_fim! > h.hora_fim) return false;
  }
  return true;
}

export function useSetupStatus(shopId: string | null | undefined) {
  return useQuery({
    queryKey: ["setup-status", shopId],
    enabled: Boolean(shopId),
    queryFn: async () => {
      const [barbeiros, servicos, horas, pagamentos] = await Promise.all([
        supabase.from("barbers").select("id", { count: "exact", head: true }).eq("barbershop_id", shopId!).eq("ativo", true),
        supabase.from("services").select("id", { count: "exact", head: true }).eq("barbershop_id", shopId!).eq("ativo", true).not("nome", "is", null),
        supabase.from("business_hours").select("dia_semana, aberto, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim").eq("barbershop_id", shopId!),
        supabase.from("payment_methods").select("id", { count: "exact", head: true }).eq("barbershop_id", shopId!).eq("active", true),
      ]);
      if (barbeiros.error) throw barbeiros.error;
      if (servicos.error) throw servicos.error;
      if (horas.error) throw horas.error;
      if (pagamentos.error) throw pagamentos.error;

      const businessHours = (horas.data ?? []) as BusinessHour[];
      const abertos = businessHours.filter((h) => h.aberto);
      const horariosOk = abertos.length > 0 && abertos.every(isValidHourRange);
      const itens: SetupItem[] = [
        { key: "servicos", label: "Serviços", descricao: "Cadastre pelo menos um serviço válido.", to: "/admin/configurar", ok: (servicos.count ?? 0) > 0 },
        { key: "barbeiros", label: "Profissionais", descricao: "Cadastre pelo menos um profissional ativo.", to: "/admin/configurar", ok: (barbeiros.count ?? 0) > 0 },
        { key: "dias", label: "Dias de atendimento", descricao: "Selecione pelo menos um dia de funcionamento.", to: "/admin/configurar", ok: abertos.length > 0 },
        { key: "horarios", label: "Horários e intervalos", descricao: "Defina horários válidos e intervalos completos dentro do expediente para todos os dias abertos.", to: "/admin/configurar", ok: horariosOk },
        { key: "pagamentos", label: "Meios de pagamento", descricao: "Cadastre pelo menos um meio de pagamento ativo.", to: "/admin/configurar", ok: (pagamentos.count ?? 0) > 0 },
      ];
      const pendentes = itens.filter((item) => !item.ok);
      return { itens, pendentes, completo: pendentes.length === 0 };
    },
    staleTime: 10_000,
  });
}

export function useBarbeariaOperacional(shopId: string | null | undefined) {
  return useQuery({
    queryKey: ["operacional", shopId],
    enabled: Boolean(shopId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("barbearia_operacional", { p_barbershop_id: shopId! });
      if (error) throw error;
      return Boolean(data);
    },
    staleTime: 10_000,
  });
}
