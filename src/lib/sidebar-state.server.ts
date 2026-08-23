import { cookies } from "next/headers";
import { SIDEBAR_COOKIE_NAME } from "@/lib/sidebar-state";

export async function getSidebarDefaultOpen(fallback = true): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value;
  if (value === undefined) return fallback;
  return value === "true";
}
