import type { DashboardSnapshot } from "@/domain/types";
import type { ProviderHistoryItem } from "./types";

export type AgentProviderId = "gemini" | "openrouter";

/** POST /api/agent */
export type AgentChatRequest = {
  message: string;
  history?: ProviderHistoryItem[];
  provider?: AgentProviderId;
};

export type AgentChatResponse = {
  text: string;
  history: ProviderHistoryItem[];
  provider: AgentProviderId;
};

/** GET /api/briefing?provider=gemini|openrouter */
export type BriefingResponse = {
  snapshot: DashboardSnapshot;
  narrative: string;
};

export type AgentApiError = {
  error: string;
};
