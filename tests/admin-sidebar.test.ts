import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const shell = readFileSync("src/components/admin/AdminShell.tsx", "utf8");
const routes = [
  "/admin",
  "/admin/agenda",
  "/admin/agendamentos",
  "/admin/clientes",
  "/admin/barbeiros",
  "/admin/servicos",
  "/admin/bloqueios",
  "/admin/pagamentos",
  "/admin/galeria",
  "/admin/configuracoes",
  "/admin/meu-link",
  "/admin/configurar",
];

test("sidebar mantém todas as rotas normais do painel, exceto a configuração duplicada de horários", () => {
  for (const route of routes) expect(shell).toContain(route);
  expect(shell).not.toContain('/admin/horarios');
});

test("sidebar possui os cinco grupos pedidos", () => {
  expect(shell).toContain('key: "agenda"');
  expect(shell).toContain('key: "pessoas"');
  expect(shell).toContain('key: "operacao"');
  expect(shell).toContain('key: "configuracoes"');
  expect(shell).toContain('key: "negocio"');
});

test("grupos abrem e fecham e persistem no navegador", () => {
  expect(shell).toContain("aria-expanded={expanded}");
  expect(shell).toContain("barberflow:admin-sidebar-groups");
  expect(shell).toContain("saveGroups(next)");
  expect(shell).toContain("grid-rows-[0fr]");
  expect(shell).toContain("duration-200");
});

test("grupo da rota atual abre automaticamente", () => {
  expect(shell).toContain("groupForPath(pathname)");
  expect(shell).toContain("setGroups((current) =>");
});

test("Dashboard continua separado e aviso permanece somente no Dashboard", () => {
  expect(shell).toContain('to="/admin"');
  expect(shell).toContain("pathname === \"/admin\" && <LicenseBanner />");
});

test("logout continua disponível", () => {
  expect(shell).toContain("supabase.auth.signOut()");
  expect(shell).toContain('navigate({ to: "/login", replace: true })');
});

test("nenhuma navegação de Super Admin foi introduzida", () => {
  expect(shell).not.toContain("super-admin");
});
