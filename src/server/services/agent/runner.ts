import { LLMProvider, ToolDefinition, ProviderHistoryItem } from "@/domain/agent/types";

const MAX_TURNS = 6;

/** Single-turn completion without tool calling (e.g. briefing narrative). */
export async function complete(opts: {
  provider: LLMProvider;
  systemPrompt: string;
  userMessage: string;
}): Promise<string> {
  const { finalText } = await runAgent({ ...opts, tools: [] });
  return finalText;
}

export async function runAgent(opts: {
  provider: LLMProvider;
  systemPrompt: string;
  tools: ToolDefinition[];
  userMessage: string;
  history?: ProviderHistoryItem[];
}): Promise<{ finalText: string; history: ProviderHistoryItem[] }> {
  const toolsByName = Object.fromEntries(opts.tools.map((t) => [t.name, t]));

  let history = opts.provider.buildUserHistory(opts.history ?? [], opts.userMessage);

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await opts.provider.send({
      systemPrompt: opts.systemPrompt,
      history,
      tools: opts.tools,
    });

    // Sin tool calls -> el modelo ya dio la respuesta final
    if (response.toolCalls.length === 0) {
      return { finalText: response.text ?? "", history };
    }

    // Ejecuta todas las tools solicitadas (en paralelo) contra tus conectores reales
    const toolResults = await Promise.all(
      response.toolCalls.map(async (call) => {
        const tool = toolsByName[call.name];
        if (!tool) {
          return { call, result: { error: `Tool "${call.name}" no está registrada` } };
        }
        try {
          const result = await tool.execute(call.args);
          return { call, result };
        } catch (err: any) {
          return { call, result: { error: err?.message ?? String(err) } };
        }
      })
    );

    history = opts.provider.buildToolResultHistory(history, response.raw, toolResults);
  }

  throw new Error("Se alcanzó el máximo de turnos sin una respuesta final del modelo");
}