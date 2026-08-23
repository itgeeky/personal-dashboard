"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  GitPullRequest,
  ListChecks,
  Send,
  Sparkles,
  TicketCheck,
} from "lucide-react";
import type { AgentApiError, AgentChatResponse } from "@/domain/agent/api";
import type { ProviderHistoryItem } from "@/domain/agent/types";
import { displayName, greeting } from "@/lib/display";
import { cn } from "@/lib/utils";
import { MarkdownMessage } from "@/components/markdown-message";

const promptIdeas = [
  "¿Qué debería hacer primero?",
  "Resume mi trabajo abierto en GitHub",
  "Busca tareas vencidas",
  "Planea alrededor de las reuniones de hoy",
];

const starterSessions = [
  {
    title: "Priorizar mi trabajo abierto",
    detail: "Compara urgencia, fechas límite y capacidad del calendario.",
    icon: ListChecks,
  },
  {
    title: "Prepararme para las reuniones de hoy",
    detail: "Encuentra tareas relacionadas y dependencias sin resolver.",
    icon: CalendarDays,
  },
  {
    title: "Revisar trabajo de desarrollo",
    detail: "Resume PRs abiertos y revisiones pendientes.",
    icon: GitPullRequest,
  },
];

const capabilities = [
  { name: "Calendario", detail: "Reuniones y bloques libres", icon: CalendarDays, live: true },
  { name: "Jira", detail: "Issues asignados", icon: TicketCheck, live: true },
  { name: "Zoho Desk", detail: "Tickets abiertos", icon: CheckCircle2, live: true },
  { name: "GitHub", detail: "Issues, PRs y revisiones", icon: GitPullRequest, live: true },
];

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function Avatar() {
  return (
    <span
      aria-hidden="true"
      className="mb-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background"
    >
      <Sparkles className="size-3.5" />
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5">
      <Avatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-card px-4 py-3.5 ring-1 ring-foreground/8">
        <span className="sr-only">Consultando tus fuentes…</span>
        <span
          aria-hidden="true"
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-none [animation-delay:-0.3s]"
        />
        <span
          aria-hidden="true"
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-none [animation-delay:-0.15s]"
        />
        <span
          aria-hidden="true"
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-none"
        />
      </div>
    </div>
  );
}

export function AgentView({ email }: { email: string | null }) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<ProviderHistoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const hasConversation = messages.length > 0;

  useEffect(() => {
    const node = transcriptRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, busy]);

  async function sendMessage(text: string) {
    const message = text.trim();
    if (!message || busy) return;

    setError(null);
    setBusy(true);
    setMessages((current) => [...current, { role: "user", content: message }]);
    setPrompt("");

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, provider: "gemini" }),
      });

      const body = (await response.json()) as AgentChatResponse | AgentApiError;
      if (!response.ok) {
        throw new Error("error" in body ? body.error : "No se pudo obtener respuesta del agente.");
      }

      const data = body as AgentChatResponse;
      setHistory(data.history);
      setMessages((current) => [...current, { role: "assistant", content: data.text }]);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al consultar el agente.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void sendMessage(prompt);
  }

  function startNewConversation() {
    setMessages([]);
    setHistory([]);
    setPrompt("");
    setError(null);
  }

  return (
    <div className="overflow-hidden rounded-4xl bg-card ring-1 ring-foreground/5">
      <section
        className={cn(
          "relative flex flex-col overflow-hidden px-5 py-8 sm:px-8",
          hasConversation ? "min-h-105" : "min-h-130 items-center justify-center py-16 text-center",
        )}
      >
        <div className="pointer-events-none absolute top-8 left-1/2 size-72 -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
        <div className={cn("relative w-full", hasConversation ? "max-w-3xl" : "max-w-3xl text-center")}>
          {!hasConversation ? (
            <>
              <span
                aria-hidden="true"
                className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-foreground text-background"
              >
                <Sparkles className="size-5" />
              </span>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {greeting()}, {displayName(email)}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Pregunta sobre tu trabajo, prioridades, capacidad o dependencias.
              </p>
            </>
          ) : (
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-left">
                <h1 className="text-lg font-semibold tracking-tight">Agente</h1>
                <p className="text-xs text-muted-foreground">
                  Conversación en esta sesión — no se guarda al recargar.
                </p>
              </div>
              <button
                type="button"
                onClick={startNewConversation}
                disabled={busy}
                className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none disabled:opacity-60"
              >
                Nueva conversación
              </button>
            </div>
          )}

          {hasConversation ? (
            <div
              ref={transcriptRef}
              className="mb-4 max-h-[min(50vh,28rem)] space-y-3 overflow-y-auto rounded-2xl bg-muted/35 p-3 text-left ring-1 ring-foreground/5"
              aria-live="polite"
              aria-relevant="additions"
            >
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    "flex items-end gap-2.5",
                    message.role === "user" && "flex-row-reverse",
                  )}
                >
                  {message.role === "assistant" ? <Avatar /> : null}
                  <div
                    className={cn(
                      "max-w-[82%] px-3.5 py-2.5",
                      message.role === "user"
                        ? "rounded-2xl rounded-br-md bg-foreground text-sm leading-6 text-background"
                        : "rounded-2xl rounded-bl-md bg-card text-foreground ring-1 ring-foreground/8",
                    )}
                  >
                    {message.role === "assistant" ? (
                      <MarkdownMessage content={message.content} />
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {busy ? <TypingIndicator /> : null}
            </div>
          ) : null}

          <form
            onSubmit={submit}
            className={cn(
              "rounded-3xl bg-muted/55 p-2 text-left ring-1 ring-foreground/8 shadow-[0_18px_60px_-35px_rgba(0,0,0,0.45)] focus-within:ring-2 focus-within:ring-foreground/25",
              !hasConversation && "mt-9",
            )}
          >
            <label htmlFor="agent-prompt" className="sr-only">
              Pregunta al agente del cockpit
            </label>
            <textarea
              id="agent-prompt"
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                setError(null);
              }}
              rows={hasConversation ? 2 : 4}
              name="agent-prompt"
              disabled={busy}
              placeholder="Pregunta qué necesita atención, resume una fuente o planea tu siguiente bloque de foco…"
              className="w-full resize-none bg-transparent px-4 pt-3 text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-60"
            />
            <div className="flex items-center justify-between gap-3 px-2 pb-1">
              <span
                className={cn(
                  "ml-1 inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-medium text-brand-foreground ring-1 ring-brand/20",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("size-1.5 rounded-full bg-brand-foreground", busy && "animate-pulse")}
                />
                {busy ? "Gemini · pensando…" : "Gemini"}
              </span>
              <button
                type="submit"
                disabled={!prompt.trim() || busy}
                aria-label="Enviar mensaje"
                className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:opacity-30"
              >
                <Send className="size-4" aria-hidden="true" />
              </button>
            </div>
          </form>

          {error ? (
            <p role="alert" className="mt-3 text-left text-xs text-destructive">
              {error}
            </p>
          ) : null}

          {!hasConversation ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {promptIdeas.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  disabled={busy}
                  onClick={() => void sendMessage(idea)}
                  className="rounded-full bg-muted/65 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none disabled:opacity-60"
                >
                  {idea}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {!hasConversation ? (
        <section className="border-t border-foreground/6 px-5 py-8 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                Conversaciones de arranque
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-pretty">
                Retoma donde ocurre el trabajo
              </h2>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {starterSessions.map((session) => (
                <button
                  key={session.title}
                  type="button"
                  disabled={busy}
                  onClick={() => void sendMessage(session.title)}
                  className="rounded-2xl bg-muted/40 p-4 text-left ring-1 ring-foreground/5 transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none disabled:opacity-60"
                >
                  <session.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-5 text-sm font-semibold">{session.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{session.detail}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-foreground/6 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div>
            <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
              Contexto disponible
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-pretty">
              Fuentes que el agente puede consultar
            </h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((capability) => (
              <div
                key={capability.name}
                className="rounded-2xl bg-muted/35 p-4 ring-1 ring-foreground/5"
              >
                <div className="flex items-start justify-between">
                  <span
                    aria-hidden="true"
                    className="flex size-9 items-center justify-center rounded-xl bg-card ring-1 ring-foreground/5"
                  >
                    <capability.icon className="size-4" />
                  </span>
                  <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-semibold text-brand-foreground">
                    {capability.live ? "Live" : "Later"}
                  </span>
                </div>
                <p className="mt-5 text-sm font-semibold">{capability.name}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{capability.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
