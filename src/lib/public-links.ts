export const CANONICAL_ORIGIN = "https://agendocorte.com";

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

/** Builds shareable links on the canonical custom domain, never on a preview or legacy host. */
export function publicShopUrl(_origin: string, slug: string) {
  return `${CANONICAL_ORIGIN}${publicShopPath(slug)}`;
}

/** Builds absolute URLs for Supabase email callbacks and other external redirects. */
export function canonicalSiteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, CANONICAL_ORIGIN).toString();
}

/**
 * Redirects the www and legacy GitHub Pages host to the canonical domain while
 * preserving the requested path, query string and fragment.
 */
export function getCanonicalRedirectUrl(currentUrl: string) {
  const current = new URL(currentUrl);
  const isLegacyHost =
    current.hostname === "www.agendocorte.com" ||
    current.hostname === "cartoriolucas4-create.github.io";

  if (!isLegacyHost) return null;

  if (current.hostname === "cartoriolucas4-create.github.io") {
    current.pathname = current.pathname.replace(/^\/happy-hub-nest(?=\/|$)/, "") || "/";
  }

  const target = new URL(CANONICAL_ORIGIN);
  target.pathname = current.pathname;
  target.search = current.search;
  target.hash = current.hash;
  return target.toString();
}
