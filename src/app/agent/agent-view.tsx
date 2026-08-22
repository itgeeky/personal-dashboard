"use client";

import { useState } from "react";
import {
  AtSign,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GitPullRequest,
  ListChecks,
  Plus,
  Send,
  Sparkles,
  TicketCheck,
} from "lucide-react";
import { displayName, greeting } from "@/lib/display";

const promptIdeas = [
  "What should I do first?",
  "Summarize my open GitHub work",
  "Find overdue tasks",
  "Plan around today's meetings",
];

const recentSessions = [
  {
    title: "Prioritize my open work",
    detail: "Compare urgency, due dates, and calendar capacity.",
    icon: ListChecks,
  },
  {
    title: "Prepare for today's meetings",
    detail: "Find related tasks and unresolved dependencies.",
    icon: CalendarDays,
  },
  {
    title: "Review development work",
    detail: "Summarize authored PRs and requested reviews.",
    icon: GitPullRequest,
  },
];

const capabilities = [
  { name: "Calendar", detail: "Meetings and free blocks", icon: CalendarDays, live: true },
  { name: "Jira", detail: "Assigned open issues", icon: TicketCheck, live: true },
  { name: "Zoho Desk", detail: "Open support tickets", icon: CheckCircle2, live: true },
  { name: "GitHub", detail: "Issues, pull requests, reviews", icon: GitPullRequest, live: true },
];

export function AgentView({ email }: { email: string | null }) {
  const [prompt, setPrompt] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!prompt.trim()) return;
    setNotice("The Agent interface is ready. Model and tool execution will be connected next.");
  }

  return (
    <div className="overflow-hidden rounded-4xl bg-card ring-1 ring-foreground/5">
      <section className="relative flex min-h-[520px] flex-col items-center justify-center overflow-hidden px-5 py-16 text-center">
        <div className="pointer-events-none absolute top-8 left-1/2 size-72 -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative w-full max-w-3xl">
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
            Ask about your work, priorities, capacity, or dependencies.
          </p>

          <form
            onSubmit={submit}
            className="mt-9 rounded-3xl bg-muted/55 p-2 text-left ring-1 ring-foreground/8 shadow-[0_18px_60px_-35px_rgba(0,0,0,0.45)] focus-within:ring-2 focus-within:ring-foreground/25"
          >
            <label htmlFor="agent-prompt" className="sr-only">
              Ask the Work Cockpit agent
            </label>
            <textarea
              id="agent-prompt"
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                setNotice(null);
              }}
              rows={4}
              name="agent-prompt"
              placeholder="Ask what needs attention, summarize a source, or plan your next focus block…"
              className="w-full resize-none bg-transparent px-4 pt-3 text-sm leading-6 outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between gap-3 px-2 pb-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Add context"
                  title="Add context"
                  className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                >
                  <Plus className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Mention a source"
                  title="Mention a source"
                  className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                >
                  <AtSign className="size-4" aria-hidden="true" />
                </button>
                <span className="ml-1 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-foreground/5">
                  No model connected
                </span>
              </div>
              <button
                type="submit"
                disabled={!prompt.trim()}
                aria-label="Send prompt"
                className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:opacity-30"
              >
                <Send className="size-4" aria-hidden="true" />
              </button>
            </div>
          </form>

          {notice ? (
            <p role="status" className="mt-3 text-xs text-muted-foreground">
              {notice}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {promptIdeas.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => {
                  setPrompt(idea);
                  setNotice(null);
                }}
                className="rounded-full bg-muted/65 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-foreground/6 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                Starter conversations
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-pretty">
                Pick up where work happens
              </h2>
            </div>
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
              <Clock3 className="size-3.5" aria-hidden="true" /> Frontend preview
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {recentSessions.map((session) => (
              <button
                key={session.title}
                type="button"
                onClick={() => {
                  setPrompt(session.title);
                  setNotice(null);
                  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                  window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
                }}
                className="rounded-2xl bg-muted/40 p-4 text-left ring-1 ring-foreground/5 transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              >
                <session.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                <p className="mt-5 text-sm font-semibold">{session.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{session.detail}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-foreground/6 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div>
            <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
              Available context
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-pretty">
              Sources the future agent can use
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
