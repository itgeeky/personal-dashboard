import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardSnapshot } from "@/domain/types";
import { BRIEFING_SYSTEM_PROMPT } from "@/server/config/systemPrompts";
import { providers, type ProviderName } from "@/server/services/agent/providers";
import { complete } from "@/server/services/agent/runner";
import { buildDashboard } from "@/server/services/dashboard";

export interface BriefingResult {
  snapshot: DashboardSnapshot;
  narrative: string;
}

export async function generateBriefing(
  supabase: SupabaseClient,
  userId: string,
  providerName: ProviderName = "gemini",
): Promise<BriefingResult> {
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Proveedor "${providerName}" no soportado`);
  }

  const snapshot = await buildDashboard(supabase, userId);
  const narrative = await synthesizeNarrative(snapshot, provider);

  return { snapshot, narrative };
}

async function synthesizeNarrative(
  snapshot: DashboardSnapshot,
  provider: (typeof providers)[ProviderName],
): Promise<string> {
  const text = await complete({
    provider,
    systemPrompt: BRIEFING_SYSTEM_PROMPT,
    userMessage: `Genera el briefing del día con este DashboardSnapshot:\n${JSON.stringify(snapshot)}`,
  });

  return text.trim() || "No se pudo generar el resumen del día.";
}
