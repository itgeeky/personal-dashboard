import {
  GoogleGenAI,
  type Content,
  type FunctionDeclaration,
  type GenerateContentResponse,
} from "@google/genai";
import type { LLMProvider, NormalizedResponse, ToolCall, ToolDefinition } from "@/domain/agent/types";
import { geminiApiKey, geminiModel } from "@/lib/gemini-config";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: geminiApiKey() });
  }
  return client;
}

function toFunctionDeclaration(tool: ToolDefinition): FunctionDeclaration {
  return {
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: tool.parameters,
  };
}

function extractText(response: GenerateContentResponse): string | null {
  const text = response.text?.trim();
  return text ? text : null;
}

function extractToolCalls(response: GenerateContentResponse): ToolCall[] {
  return (response.functionCalls ?? []).map((call, index) => ({
    id: call.id ?? `${call.name ?? "tool"}-${index}`,
    name: call.name ?? "unknown",
    args: (call.args ?? {}) as Record<string, unknown>,
  }));
}

export const geminiProvider: LLMProvider = {
  name: "gemini",

  buildUserHistory(prior, userText): Content[] {
    const history = prior as Content[];
    return [...history, { role: "user", parts: [{ text: userText }] }];
  },

  buildToolResultHistory(prior, assistantRaw, toolResults): Content[] {
    const history = prior as Content[];
    const response = assistantRaw as GenerateContentResponse;
    const modelContent = response.candidates?.[0]?.content;

    const next: Content[] = [...history];
    if (modelContent) {
      next.push(modelContent);
    }

    next.push({
      role: "user",
      parts: toolResults.map(({ call, result }) => ({
        functionResponse: {
          id: call.id,
          name: call.name,
          response:
            typeof result === "object" && result !== null && !Array.isArray(result)
              ? result
              : { output: result },
        },
      })),
    });

    return next;
  },

  async send({ systemPrompt, history, tools }): Promise<NormalizedResponse> {
    const response = await getClient().models.generateContent({
      model: geminiModel(),
      contents: history as Content[],
      config: {
        systemInstruction: systemPrompt,
        tools:
          tools.length > 0
            ? [{ functionDeclarations: tools.map(toFunctionDeclaration) }]
            : undefined,
      },
    });

    return {
      text: extractText(response),
      toolCalls: extractToolCalls(response),
      raw: response,
    };
  },
};
