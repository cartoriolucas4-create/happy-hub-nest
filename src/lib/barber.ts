export const DIAS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

export const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
  nao_compareceu: "Não compareceu",
};

export const STATUS_LIST = [
  "pendente",
  "confirmado",
  "concluido",
  "cancelado",
  "nao_compareceu",
] as const;

export type Status = (typeof STATUS_LIST)[number];

export function statusClass(status: string) {
  switch (status) {
    case "confirmado":
      return "bg-primary/15 text-primary border-primary/30";
    case "concluido":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "cancelado":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "nao_compareceu":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  }
}

export function brl(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function hhmm(t: string | null | undefined) {
  return (t ?? "").slice(0, 5);
}

/** Local ISO date (yyyy-mm-dd) without UTC shift. */
export function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayIso() {
  return isoDate(new Date());
}

export function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  return isoDate(dt);
}

export function brDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function isPhone(v: string) {
  return v.replace(/\D/g, "").length >= 10;
}

export function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}
