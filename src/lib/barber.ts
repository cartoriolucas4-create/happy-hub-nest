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

/** Máscara de entrada monetária brasileira: 1999 → 19,99; 150099 → 1.500,99. */
export function formatBrlInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const amount = Number(digits) / 100;
  return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

/* ----------  Dados dinâmicos da barbearia (multi-tenant)  ---------- */

export type ShopLike = {
  nome?: string | null;
  whatsapp?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  mensagem_whatsapp?: string | null;
};

/** Número em formato internacional (55 + DDD + número), vindo sempre do banco. */
export function waNumber(shop: ShopLike | null | undefined) {
  const raw = onlyDigits(shop?.whatsapp ?? shop?.telefone ?? "");
  if (!raw) return "";
  if (raw.startsWith("55")) return raw;
  return `55${raw}`;
}

export function waLink(shop: ShopLike | null | undefined, mensagem?: string) {
  const num = waNumber(shop);
  if (!num) return "";
  const texto =
    mensagem ??
    (shop?.mensagem_whatsapp?.trim() ||
      `Olá! Gostaria de saber mais sobre os serviços da ${shop?.nome ?? "barbearia"}.`);
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

/** "Rua São José, 100 — Centro" */
export function enderecoLinha1(shop: ShopLike | null | undefined) {
  const rua = [shop?.endereco, shop?.numero].filter(Boolean).join(", ");
  const compl = [shop?.complemento, shop?.bairro].filter(Boolean).join(" — ");
  return [rua, compl].filter(Boolean).join(" — ");
}

/** "Salgueiro - PE · 56000-000" */
export function enderecoLinha2(shop: ShopLike | null | undefined) {
  const cidade = [shop?.cidade, shop?.estado].filter(Boolean).join(" - ");
  return [cidade, shop?.cep].filter(Boolean).join(" · ");
}

export function enderecoCompleto(shop: ShopLike | null | undefined) {
  return [enderecoLinha1(shop), enderecoLinha2(shop)].filter(Boolean).join(", ");
}

export function mapsLink(shop: ShopLike | null | undefined) {
  const end = enderecoCompleto(shop);
  if (!end) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`;
}

/** Mensagem de confirmação enviada para o WhatsApp DA BARBEARIA. */
export function mensagemAgendamento(p: {
  barbearia: string;
  cliente: string;
  telefoneCliente: string;
  servico: string;
  barbeiro: string;
  data: string;
  hora: string;
  duracao: number;
  valor: number | string;
  pagamento?: string;
  observacao?: string;
}) {
  const linhas = [
    "Olá! Gostaria de confirmar um agendamento.",
    "",
    `Barbearia: ${p.barbearia}`,
    "",
    `Cliente: ${p.cliente}`,
    `WhatsApp: ${p.telefoneCliente}`,
    "",
    `Serviço: ${p.servico}`,
    `Barbeiro: ${p.barbeiro}`,
    `Data: ${brDate(p.data)}`,
    `Horário: ${p.hora}`,
    `Duração: ${p.duracao} minutos`,
    `Valor: ${brl(p.valor)}`,
  ];
  if (p.pagamento?.trim()) linhas.push(`Forma de pagamento: ${p.pagamento.trim()}`);
  if (p.observacao?.trim()) linhas.push("", "Observação:", p.observacao.trim());
  linhas.push("", "Agendamento realizado através do Meu Link.");
  return linhas.join("\n");
}
