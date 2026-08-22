import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getAuth = cache(async () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return { user: null, supabase: null as Awaited<ReturnType<typeof createClient>> | null };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, supabase };
});

export const currentUserEmail = cache(async (): Promise<string | null> => {
  const { user } = await getAuth();
  return user?.email ?? null;
});
