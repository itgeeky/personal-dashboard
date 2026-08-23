import { requireEnv } from "@/lib/env";

export function geminiApiKey(): string {
  return requireEnv("GEMINI_API_KEY");
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}
