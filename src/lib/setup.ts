import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SetupItemKey = "dias" | "barbeiros" | "servicos" | "horarios" | "pagamentos";

export type SetupItem = {
  key: SetupItemKey;
  label: string;
  descricao: string;
  to: string;
  ok: boolean;
};

/**
 * Estado da configuração inicial calculado SEMPRE a partir dos dados reais da
 * barbearia (nunca só de um booleano), para que a exclusão posterior de
 * barbeiros, serviços ou horários volte a marcar a barbearia como incompleta.
 */
export function useSetupStatus(shopId: string | null | undefined) {
  return useQuery({
    queryKey: ["setup-status", shopId],
    enabled: Boolean(shopId),
    queryFn: async () => {
      const [barbeiros, servicos, horas, pagamentos] = await Promise.all([
        supabase
          .from("barbers")
          .select("id", { count: "exact", head: true })
          .eq("barbershop_id", shopId!)
          .eq("ativo", true),
        supabase
          .from("services")
          .select("id", { count: "exact", head: true })
          .eq("barbershop_id", shopId!)
          .eq("ativo", true),
        supabase
          .from("business_hours")
          .select("dia_semana, aberto, hora_inicio, hora_fim")
          .eq("barbershop_id", shopId!),
        supabase
          .from("payment_methods")
          .select("id", { count: "exact", head: true })
          .eq("barbershop_id", shopId!)
          .eq("active", true),
      ]);

      const abertos = (horas.data ?? []).filter((h) => h.aberto);
      const horariosOk =
        abertos.length > 0 && abertos.every((h) => Boolean(h.hora_inicio && h.hora_fim && h.hora_fim > h.hora_inicio));

      const itens: SetupItem[] = [
        {
          key: "dias",
          label: "Dias de atendimento",
          descricao: "Escolha em quais dias da semana a barbearia atende.",
          to: "/admin/horarios",
          ok: abertos.length > 0,
        },
        {
          key: "barbeiros",
          label: "Barbeiros",
          descricao: "Cadastre pelo menos um profissional.",
          to: "/admin/barbeiros",
          ok: (barbeiros.count ?? 0) > 0,
        },
        {
          key: "servicos",
          label: "Serviços",
          descricao: "Cadastre pelo menos um serviço com preço e duração.",
          to: "/admin/servicos",
          ok: (servicos.count ?? 0) > 0,
        },
        {
          key: "horarios",
          label: "Horários",
          descricao: "Defina o horário de abertura e fechamento dos dias abertos.",
          to: "/admin/horarios",
          ok: horariosOk,
        },
        {
          key: "pagamentos",
          label: "Meios de pagamento",
          descricao: "Cadastre as formas de pagamento que você aceita.",
          to: "/admin/pagamentos",
          ok: (pagamentos.count ?? 0) > 0,
        },
      ];

      const pendentes = itens.filter((i) => !i.ok);
      return { itens, pendentes, completo: pendentes.length === 0 };
    },
    staleTime: 10_000,
  });
}

/** Verifica no banco se a barbearia pode receber agendamentos públicos. */
export function useBarbeariaOperacional(shopId: string | null | undefined) {
  return useQuery({
    queryKey: ["operacional", shopId],
    enabled: Boolean(shopId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("barbearia_operacional", {
        p_barbershop_id: shopId!,
      });
      if (error) throw error;
      return Boolean(data);
    },
    staleTime: 10_000,
  });
}
