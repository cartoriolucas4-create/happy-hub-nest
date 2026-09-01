import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/barbearia/$slug/agendar")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/$slug/agendar", params: { slug: params.slug }, replace: true });
  },
});
