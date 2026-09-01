import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/barbearia/$slug/")({
  beforeLoad: ({ params }) => {
    throw Route.redirect({ to: "/$slug", params: { slug: params.slug }, replace: true });
  },
});
