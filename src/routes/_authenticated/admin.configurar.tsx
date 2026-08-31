import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { SetupWizard } from "@/components/admin/SetupWizard";
import { useShop } from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/admin/configurar")({
  head: () => ({
    meta: [
      { title: "Configuração inicial | BarberFlow" },
      { name: "description", content: "Configure serviços, profissionais, dias, horários e pagamentos da sua barbearia." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Configurar,
});

function Configurar() {
  const { data: shop } = useShop();
  return (
    <AdminShell title="Configuração inicial" subtitle="Complete os dados reais da sua barbearia para colocar o site no ar.">
      {shop ? <SetupWizard shopId={shop.id} /> : <p className="text-sm text-muted-foreground">Carregando barbearia...</p>}
    </AdminShell>
  );
}
