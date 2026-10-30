export function signupErrorMessage(error: unknown, step: "slug" | "auth"): string {
  const detail =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : "Falha inesperada. Tente novamente.";

  if (/failed to fetch|fetch failed|network|load failed|timeout/i.test(detail)) {
    return step === "slug"
      ? "Não foi possível consultar o serviço que verifica os links. O nome escolhido não foi considerado inválido nem ocupado: a consulta ao servidor falhou. Tente novamente quando a conexão com o serviço for restabelecida."
      : "Não foi possível conectar ao serviço de cadastro. Seus dados não foram enviados. O serviço de contas precisa estar disponível para criar a conta.";
  }

  const prefix =
    step === "slug"
      ? "Não foi possível verificar o link da barbearia"
      : "Não foi possível criar a conta";
  return `${prefix}: ${detail}`;
}
