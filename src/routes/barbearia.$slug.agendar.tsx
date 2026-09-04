import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/barbearia/$slug/agendar")({
  // O agendamento público não usa autenticação social nem exige login.
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/$slug/agendar", params: { slug: params.slug }, replace: true });
  },
});
