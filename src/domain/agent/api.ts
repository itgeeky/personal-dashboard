import type { DashboardSnapshot } from "@/domain/types";
import type { ProviderHistoryItem } from "./types";

/** POST /api/agent */
export type AgentChatRequest = {
  message: string;
  history?: ProviderHistoryItem[];
  provider?: "gemini";
};

export type AgentChatResponse = {
  text: string;
  history: ProviderHistoryItem[];
  provider: "gemini";
};

/** GET /api/briefing?provider=gemini */
export type BriefingResponse = {
  snapshot: DashboardSnapshot;
  narrative: string;
};

export type AgentApiError = {
  error: string;
};
