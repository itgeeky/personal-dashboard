import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { fetchWithJwtRetry } from "@/lib/supabase/fetch-with-jwt-retry";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
    global: { fetch: fetchWithJwtRetry },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/api/integrations/google/callback") ||
    path.startsWith("/api/integrations/microsoft/callback") ||
    path.startsWith("/api/integrations/jira/callback") ||
    path.startsWith("/api/integrations/zoho/callback") ||
    path.startsWith("/api/integrations/github/callback");

  if (!user && !isPublic && !path.startsWith("/api")) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    return NextResponse.redirect(redirect);
  }

  if (user && path.startsWith("/login")) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/";
    return NextResponse.redirect(redirect);
  }

  return response;
}
