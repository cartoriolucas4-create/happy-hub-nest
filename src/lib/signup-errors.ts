export function signupErrorMessage(error: unknown, step: "slug" | "auth"): string {
  const detail = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
      ? error.message
      : "Falha inesperada. Tente novamente.";
  const prefix = step === "slug" ? "Não foi possível verificar o link da barbearia" : "Não foi possível criar a conta";
  if (/failed to fetch|fetch failed|network|load failed/i.test(detail)) {
    return `${prefix}: falha de conexão com o serviço de contas. Confira sua conexão; se persistir, o serviço pode estar indisponível. Detalhe: ${detail}`;
  }
  return `${prefix}: ${detail}`;
}