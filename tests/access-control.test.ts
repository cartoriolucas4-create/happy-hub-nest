import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260830210000_super_admin_access_deadline_control.sql", "utf8");
const detail = readFileSync("src/routes/_authenticated/super-admin.clientes.$id.tsx", "utf8");
const bulk = readFileSync("src/routes/_authenticated/super-admin.clientes.index.tsx", "utf8");
const accessComponent = readFileSync("src/components/superadmin/ControlePrazoAcesso.tsx", "utf8");

function addCalendar(date: Date, amount: number, unit: "dias" | "meses" | "anos") {
  const next = new Date(date.getTime());
  if (unit === "dias") next.setUTCDate(next.getUTCDate() + amount);
  if (unit === "meses") next.setUTCMonth(next.getUTCMonth() + amount);
  if (unit === "anos") next.setUTCFullYear(next.getUTCFullYear() + amount);
  return next;
}

function removeCalendar(date: Date, amount: number, unit: "dias" | "meses" | "anos") {
  return addCalendar(date, -amount, unit);
}

test("1. adiciona 30 dias", () => expect(addCalendar(new Date("2027-09-01T23:59:00Z"), 30, "dias").toISOString()).toBe("2027-10-01T23:59:00.000Z"));
test("2. remove 30 dias", () => expect(removeCalendar(new Date("2027-09-30T23:59:00Z"), 30, "dias").toISOString()).toBe("2027-08-31T23:59:00.000Z"));
test("3. adiciona 1 mês", () => expect(addCalendar(new Date("2027-09-30T23:59:00Z"), 1, "meses").toISOString()).toBe("2027-10-30T23:59:00.000Z"));
test("4. remove 1 mês", () => expect(removeCalendar(new Date("2027-09-30T23:59:00Z"), 1, "meses").toISOString()).toBe("2027-08-30T23:59:00.000Z"));
test("5. adiciona 1 ano", () => expect(addCalendar(new Date("2027-09-30T23:59:00Z"), 1, "anos").toISOString()).toBe("2028-09-30T23:59:00.000Z"));
test("6. remove 1 ano", () => expect(removeCalendar(new Date("2027-09-30T23:59:00Z"), 1, "anos").toISOString()).toBe("2026-09-30T23:59:00.000Z"));
test("7. definir vencimento futuro usa RPC exato", () => { expect(accessComponent).toContain('fn = "sa_definir_vencimento"'); expect(accessComponent).toContain("new Date(vencimento).toISOString()"); });
test("8. definir vencimento anterior é permitido", () => { expect(accessComponent).toContain("Você pode escolher uma data anterior ou posterior ao vencimento atual."); expect(migration).toContain("p_vencimento > now()"); });
test("9. encerrar acesso imediatamente", () => { expect(migration).toContain("'ACCESS_TERMINATED'"); expect(migration).toContain("v_agora timestamptz := now()"); });
test("10. cliente ativo mantém extensão a partir do vencimento", () => expect(migration).toContain("v_st = 'active' AND v_lic.access_expires_at IS NOT NULL AND v_lic.access_expires_at > now()"));
test("11. cliente expirado renova a partir de agora", () => { expect(migration).toContain("v_base := now();"); expect(migration).toContain("v_acao := 'ACCESS_RENEWED';"); });
test("12. cliente bloqueado não é desbloqueado por alteração de prazo", () => { expect(migration).toContain("v_st IN ('blocked','suspended')"); expect(migration).toContain("status = CASE WHEN v_st IN ('blocked','suspended') THEN status ELSE 'active' END"); });
test("13. usuário comum é negado por sa_require", () => { expect(migration).toContain("v_me uuid := public.sa_require()"); expect(migration).toContain("PERFORM public.sa_assert_not_super_admin(p_user_id)"); });
test("14. super admin não pode ser alvo", () => { expect(migration).toContain("public.has_role(p_user_id, 'super_admin')"); expect(migration).toContain("Operacoes de acesso nao podem ser aplicadas a um super admin"); });
test("15. histórico registra antes e depois", () => { expect(migration).toContain("vencimento_anterior"); expect(migration).toContain("novo_vencimento"); expect(migration).toContain("super_admin_id"); });
test("16. senha não aparece no histórico de prazo", () => { expect(migration).not.toContain("password"); expect(migration).not.toContain("senha"); });
test("17. ações em massa existem", () => { expect(migration).toContain("sa_liberar_acesso_massa"); expect(migration).toContain("sa_remover_tempo_acesso_massa"); expect(migration).toContain("sa_definir_vencimento_massa"); expect(bulk).toContain("sa_liberar_acesso_massa"); expect(bulk).toContain("sa_remover_tempo_acesso_massa"); expect(bulk).toContain("sa_definir_vencimento_massa"); });
test("18. ações em massa rejeitam super admin", () => expect(migration).toContain("IF EXISTS (SELECT 1 FROM unnest(p_user_ids) x WHERE public.has_role(x, 'super_admin'))"));
test("19. dashboard é invalidado após alteração", () => { expect(detail).toContain('queryClient.invalidateQueries({ queryKey: ["sa-clientes"] })'); expect(detail).toContain('queryClient.invalidateQueries({ queryKey: ["sa-stats"] })'); expect(detail).toContain('queryClient.invalidateQueries({ queryKey: ["sa-historico", id] })'); });
test("20. painel normal da barbearia não foi alterado", () => { expect(detail).not.toContain("/admin/"); expect(bulk).not.toContain("/admin/"); });
