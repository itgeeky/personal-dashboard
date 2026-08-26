import type { LLMProvider, NormalizedResponse, ToolCall, ToolDefinition } from "@/domain/agent/types";
import { appUrl } from "@/lib/env";
import { openrouterApiKey, openrouterModel } from "@/lib/openrouter-config";

const CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";

type ORToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type ORMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ORToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string };

type OpenRouterError = {
  code?: number;
  message: string;
  metadata?: {
    error_type?: string;
    provider_code?: string | number;
    raw?: unknown;
    reasons?: unknown;
    provider_name?: string;
    [key: string]: unknown;
  };
};

type ORChatCompletion = {
  choices?: { message: { role: "assistant"; content: string | null; tool_calls?: ORToolCall[] } }[];
  error?: OpenRouterError;
};

/** OpenRouter's top-level `message` is often a generic "Provider returned error" — the
 *  actual upstream cause lives in `metadata` (error_type, provider_code, raw). Surface it. */
function describeError(error: OpenRouterError | undefined, status: number): string {
  if (!error) return `OpenRouter request failed (${status})`;

  const details: string[] = [];
  const metadata = error.metadata;
  if (metadata?.error_type) details.push(`type=${metadata.error_type}`);
  if (metadata?.provider_name) details.push(`provider=${metadata.provider_name}`);
  if (metadata?.provider_code !== undefined) details.push(`provider_code=${metadata.provider_code}`);
  if (metadata?.raw !== undefined) {
    details.push(`raw=${typeof metadata.raw === "string" ? metadata.raw : JSON.stringify(metadata.raw)}`);
  }
  if (metadata?.reasons !== undefined) details.push(`reasons=${JSON.stringify(metadata.reasons)}`);

  const base = `${error.message} (${status})`;
  return details.length > 0 ? `${base} — ${details.join(", ")}` : base;
}

function toOpenRouterTool(tool: ToolDefinition) {
  return {
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

function extractText(message: { content: string | null }): string | null {
  const text = message.content?.trim();
  return text ? text : null;
}

function extractToolCalls(message: { tool_calls?: ORToolCall[] }): ToolCall[] {
  return (message.tool_calls ?? []).map((call) => ({
    id: call.id,
    name: call.function.name,
    args: call.function.arguments ? JSON.parse(call.function.arguments) : {},
  }));
}

export const openrouterProvider: LLMProvider = {
  name: "openrouter",

  buildUserHistory(prior, userText): ORMessage[] {
    const history = prior as ORMessage[];
    return [...history, { role: "user", content: userText }];
  },

  buildToolResultHistory(prior, assistantRaw, toolResults): ORMessage[] {
    const history = prior as ORMessage[];
    const response = assistantRaw as ORChatCompletion;
    const assistantMessage = response.choices?.[0]?.message;

    const next: ORMessage[] = [...history];
    if (assistantMessage) {
      next.push({
        role: "assistant",
        content: assistantMessage.content,
        tool_calls: assistantMessage.tool_calls,
      });
    }

    for (const { call, result } of toolResults) {
      next.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }

    return next;
  },

  async send({ systemPrompt, history, tools }): Promise<NormalizedResponse> {
    const res = await fetch(CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterApiKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": appUrl(),
        "X-Title": "Personal Dashboard",
      },
      body: JSON.stringify({
        model: openrouterModel(),
        messages: [{ role: "system", content: systemPrompt }, ...(history as ORMessage[])],
        tools: tools.length > 0 ? tools.map(toOpenRouterTool) : undefined,
      }),
    });

    const json = (await res.json()) as ORChatCompletion;
    if (!res.ok || json.error) {
      // Full payload only in server logs — the UI only shows the thrown message.
      console.error("[openrouter] request failed", { status: res.status, error: json.error });
      throw new Error(describeError(json.error, res.status));
    }

    const message = json.choices?.[0]?.message;
    if (!message) {
      throw new Error("OpenRouter no devolvió ningún mensaje");
    }

    return {
      text: extractText(message),
      toolCalls: extractToolCalls(message),
      raw: json,
    };
  },
};
