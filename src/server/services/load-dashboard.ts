import { cache } from "react";
import { getAuth } from "@/lib/current-user";
import { buildDashboard } from "./dashboard";

export const getDashboardSnapshot = cache(async () => {
  const { user, supabase } = await getAuth();
  if (!user || !supabase) return null;
  return buildDashboard(supabase, user.id);
});
