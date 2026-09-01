export const RESERVED_PUBLIC_SLUGS = new Set([
  "admin",
  "cadastro",
  "login",
  "reset-password",
  "super-admin",
  "barbearia",
  "api",
]);

export function isReservedPublicSlug(slug: string) {
  return RESERVED_PUBLIC_SLUGS.has(slug.trim().toLowerCase());
}

export function publicShopPath(slug: string) {
  return `/${encodeURIComponent(slug)}`;
}

export function publicShopBookingPath(slug: string) {
  return `${publicShopPath(slug)}/agendar`;
}

export function publicShopUrl(origin: string, slug: string) {
  return `${origin.replace(/\/+$/, "")}${publicShopPath(slug)}`;
}
