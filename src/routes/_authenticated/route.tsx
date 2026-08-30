import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAuthenticatedArea, homeForArea } from "@/lib/auth-area";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const session = await getAuthenticatedArea();
    if (!session) throw redirect({ to: "/login" });
    const wantsSuperAdmin = location.pathname.startsWith("/super-admin");
    if (
      (session.area === "super-admin" && !wantsSuperAdmin) ||
      (session.area !== "super-admin" && wantsSuperAdmin)
    ) {
      throw redirect({ to: homeForArea(session.area), replace: true });
    }
    return session;
  },
  component: () => <Outlet />,
});
