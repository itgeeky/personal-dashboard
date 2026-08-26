import { requireEnv } from "@/lib/env";

export function openrouterApiKey(): string {
  return requireEnv("OPENROUTER_API_KEY");
}

export function openrouterModel(): string {
  return process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";
}
