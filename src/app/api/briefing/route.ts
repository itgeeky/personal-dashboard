import { getAuth } from "@/lib/current-user";
import type { ProviderName } from "@/server/services/agent/providers";
import { providers } from "@/server/services/agent/providers";
import { generateBriefing } from "@/server/services/briefing/generateBriefing";

export async function GET(req: Request) {
  const { user, supabase } = await getAuth();
  if (!user || !supabase) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const requested = new URL(req.url).searchParams.get("provider") ?? "gemini";
  if (!(requested in providers)) {
    return Response.json({ error: `Proveedor "${requested}" no soportado` }, { status: 400 });
  }

  try {
    const result = await generateBriefing(supabase, user.id, requested as ProviderName);
    return Response.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error generando el briefing";
    return Response.json({ error: message }, { status: 500 });
  }
}
