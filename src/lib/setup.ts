import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SetupStatus = {
  dias_atendimento: boolean;
  barbeiros: boolean;
  servicos: boolean;
  horarios: boolean;
  meios_pagamento: boolean;
  concluida: boolean;
};

/** Real setup status calculated from the barbershop's operational records. */
export function useSetupStatus(enabled = true) {
  return useQuery({
    queryKey: ["barbershop-setup-status"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("barbershop_setup_status");
      if (error) throw error;
      return (data?.[0] ?? null) as SetupStatus | null;
    },
  });
}
