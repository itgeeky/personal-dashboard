import { LLMProvider } from "@/domain/agent/types";
import { geminiProvider } from "./gemini";

export const providers = {
  gemini: geminiProvider,
} satisfies Record<string, LLMProvider>;
 
export type ProviderName = keyof typeof providers;
 
