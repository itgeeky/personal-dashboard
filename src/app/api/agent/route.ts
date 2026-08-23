import type { ProviderHistoryItem } from "@/domain/agent/types";
import { getAuth } from "@/lib/current-user";
import { AGENT_SYSTEM_PROMPT } from "@/server/config/systemPrompts";
import { providers, type ProviderName } from "@/server/services/agent/providers";
import { runAgent } from "@/server/services/agent/runner";
import { createAgentTools } from "@/server/services/agent/tools/registry";

export async function POST(req: Request) {
  const { user, supabase } = await getAuth();
  if (!user || !supabase) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await req.json()) as {
    message?: string;
    history?: ProviderHistoryItem[];
    provider?: string;
  };

  if (!body.message || typeof body.message !== "string") {
    return Response.json({ error: "Falta 'message'" }, { status: 400 });
  }

  const providerName = (body.provider ?? "gemini") as ProviderName;
  const provider = providers[providerName];
  if (!provider) {
    return Response.json({ error: `Proveedor "${providerName}" no soportado` }, { status: 400 });
  }

  const displayName =
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email?.split("@")[0] ||
    "Carlos";

  try {
    const result = await runAgent({
      provider,
      systemPrompt: AGENT_SYSTEM_PROMPT(displayName),
      tools: createAgentTools(supabase, user.id),
      userMessage: body.message,
      history: body.history,
    });

    return Response.json({
      text: result.finalText,
      history: result.history,
      provider: providerName,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error ejecutando el agente";
    return Response.json({ error: message }, { status: 500 });
  }
}
