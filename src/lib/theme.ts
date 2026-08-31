export const DEFAULT_ACCENT_COLOR = "oklch(0.75 0.075 82)";
export const DEFAULT_ACCENT_DB_VALUE = "#c8963e";

export type AccentOption = {
  id: string;
  name: string;
  value: string;
};

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: "default", name: "Padrão", value: DEFAULT_ACCENT_DB_VALUE },
  { id: "gold", name: "Dourado", value: "#c8963e" },
  { id: "red", name: "Vermelho", value: "#dc2626" },
  { id: "blue", name: "Azul", value: "#2563eb" },
  { id: "green", name: "Verde", value: "#16a34a" },
  { id: "purple", name: "Roxo", value: "#9333ea" },
  { id: "orange", name: "Laranja", value: "#ea580c" },
  { id: "pink", name: "Rosa", value: "#db2777" },
  { id: "navy", name: "Azul-marinho", value: "#1e3a8a" },
  { id: "white", name: "Branco", value: "#f5f5f5" },
  { id: "silver", name: "Prata", value: "#a3a3a3" },
];

export function resolveAccentColor(value: string | null | undefined) {
  return !value || value === DEFAULT_ACCENT_DB_VALUE ? DEFAULT_ACCENT_COLOR : value;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return null;
  const value = Number.parseInt(normalized, 16);
  if (!Number.isFinite(value)) return null;
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function luminanceChannel(channel: number) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function accentForeground(value: string) {
  const rgb = hexToRgb(value);
  if (!rgb) return "oklch(0.1 0 0)";
  const luminance =
    0.2126 * luminanceChannel(rgb.r) +
    0.7152 * luminanceChannel(rgb.g) +
    0.0722 * luminanceChannel(rgb.b);
  return luminance > 0.55 ? "oklch(0.1 0 0)" : "oklch(0.98 0 0)";
}

export function accentStyle(value: string | null | undefined): Record<string, string> {
  const accent = resolveAccentColor(value);
  const foreground = accentForeground(accent);
  return {
    "--primary": accent,
    "--primary-foreground": foreground,
    "--accent": accent,
    "--accent-foreground": foreground,
    "--ring": accent,
    "--sidebar-primary": accent,
    "--sidebar-primary-foreground": foreground,
    "--sidebar-ring": accent,
  };
}
