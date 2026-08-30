import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthArea = "super-admin" | "barbershop";

/**
 * Resolves the authenticated user's only permitted application area. The
 * global role always wins so a super admin can never fall through to the
 * barbershop experience.
 */
export async function getAuthenticatedArea(): Promise<{ user: User; area: AuthArea } | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: isSuperAdmin, error: roleError } = await supabase.rpc("has_role", {
    _user_id: data.user.id,
    _role: "super_admin",
  });
  if (roleError) throw roleError;
  return { user: data.user, area: isSuperAdmin ? "super-admin" : "barbershop" };
}

export function homeForArea(area: AuthArea) {
  return area === "super-admin" ? "/super-admin" : "/admin";
}
