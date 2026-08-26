import { LLMProvider } from "@/domain/agent/types";
import { geminiProvider } from "./gemini";
import { openrouterProvider } from "./openrouter";

export const providers = {
  gemini: geminiProvider,
  openrouter: openrouterProvider,
} satisfies Record<string, LLMProvider>;
 
export type ProviderName = keyof typeof providers;
 
