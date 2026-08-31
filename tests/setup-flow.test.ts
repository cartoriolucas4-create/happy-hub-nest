import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const setup = readFileSync("src/lib/setup.ts", "utf8");
const wizard = readFileSync("src/components/admin/SetupWizard.tsx", "utf8");
const dashboard = readFileSync("src/components/admin/SetupChecklist.tsx", "utf8");
const meuLink = readFileSync("src/routes/_authenticated/admin.meu-link.tsx", "utf8");
const publicGate = readFileSync("src/components/public/PublicSetupGate.tsx", "utf8");
const root = readFileSync("src/routes/__root.tsx", "utf8");
const migration = readFileSync("supabase/migrations/20260831010000_require_real_barbershop_setup.sql", "utf8");

test("readiness is based on real service, professional, days/hours and payment data", () => {
  for (const table of ["services", "barbers", "business_hours", "payment_methods"]) expect(setup).toContain(table);
  expect(setup).toContain("completo: pendentes.length === 0");
  expect(setup).toContain("/admin/configurar");
});

test("wizard does not seed fake operational data", () => {
  expect(wizard).not.toContain("Corte + Barba");
  expect(wizard).not.toContain("45");
  expect(wizard).not.toContain("09:00");
  expect(wizard).toContain("Cadastrar serviço");
  expect(wizard).toContain("Cadastrar profissional");
  expect(wizard).toContain("Cadastrar pagamento");
});

test("dashboard and Meu Link use the same centralized wizard", () => {
  expect(dashboard).toContain('to="/admin/configurar"');
  expect(meuLink).toContain('to="/admin/configurar"');
});

test("new shops no longer receive automatic payment methods", () => {
  expect(migration).toContain("DROP TRIGGER IF EXISTS barbershops_seed_default_payment_methods");
  expect(migration).toContain("DROP TRIGGER IF EXISTS barbershops_seed_payment_methods");
});

test("public site is blocked until operational readiness", () => {
  expect(publicGate).toContain('supabase.rpc("barbearia_operacional"');
  expect(publicGate).toContain("Esta barbearia ainda está configurando seu atendimento.");
  expect(root).toContain("<PublicSetupGate><Outlet /></PublicSetupGate>");
  expect(migration).toContain("barbershop_setup_complete(v_shop)");
});
