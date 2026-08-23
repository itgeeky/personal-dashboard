// Esquema neutral (JSON Schema estándar) - lo mismo sirve para Anthropic y Gemini
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  description?: string;
  enum?: string[];
}

// Una tool se define UNA sola vez, sin importar el proveedor
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (args: Record<string, any>) => Promise<any>;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

// Lo que el runner recibe de cualquier proveedor, ya normalizado
export interface NormalizedResponse {
  text: string | null;
  toolCalls: ToolCall[];
  raw: any; // respuesta cruda del proveedor, necesaria para reconstruir el historial
}

// El historial se guarda en formato "opaco": cada proveedor sabe leer/escribir el suyo
export type ProviderHistoryItem = any;

export interface LLMProvider {
  name: string;

  send(params: {
    systemPrompt: string;
    history: ProviderHistoryItem[];
    tools: ToolDefinition[];
  }): Promise<NormalizedResponse>;

  buildUserHistory(
    priorHistory: ProviderHistoryItem[],
    userText: string
  ): ProviderHistoryItem[];

  buildToolResultHistory(
    priorHistory: ProviderHistoryItem[],
    assistantRaw: any,
    toolResults: { call: ToolCall; result: any }[]
  ): ProviderHistoryItem[];
}