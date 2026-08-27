"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Clock,
  Flame,
  Hourglass,
  ListChecks,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { DayStrip } from "@/components/day-strip";
import { EmptyHint, Panel, PanelHeader } from "@/components/panel";
import { TaskForm } from "@/components/task-form-lazy";
import { TaskRow } from "@/components/task-row";
import type { BriefingResponse } from "@/domain/agent/api";
import type { AttentionItem, DashboardSnapshot, WorkItemWithOverlay } from "@/domain/types";
import { displayName, formatDuration, formatLongDate, greeting, initials, truncateText } from "@/lib/display";
import { formatTime, reasonLabel } from "@/lib/format";
import { useDashboard } from "@/lib/use-dashboard";
import { cn } from "@/lib/utils";

const DASHBOARD_TASK_TITLE_MAX = 32;

export function DashboardView({
  email,
  initialData,
}: {
  email?: string | null;
  initialData?: DashboardSnapshot | null;
}) {
  const { data, loading, error, reload, setError } = useDashboard(initialData);
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [isPending, startTransition] = useTransition();
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingBusy, setBriefingBusy] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return { pending: [], waitingFor: [], attention: [] };
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) {
      return {
        pending: data.pending,
        waitingFor: data.waitingFor,
        attention: data.attention,
      };
    }
    const match = (value: string) => value.toLowerCase().includes(needle);
    return {
      pending: data.pending.filter((item) => match(item.title)),
      waitingFor: data.waitingFor.filter((item) => match(item.title)),
      attention: data.attention.filter((item) => match(item.title)),
    };
  }, [data, deferredQuery]);

  async function capture(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    if (!response.ok) {
      setError("Could not create the task.");
      return;
    }
    setTitle("");
    await reload();
  }

  function syncCalendar() {
    startTransition(async () => {
      const response = await fetch("/api/calendar/sync", { method: "POST" });
      if (!response.ok) {
        setError("Calendar sync failed. Connect Outlook or Google in Settings.");
        return;
      }
      await reload();
    });
  }

  async function generateBriefing() {
    setBriefingBusy(true);
    setBriefingError(null);
    try {
      const response = await fetch("/api/briefing?provider=gemini");
      const body = (await response.json()) as BriefingResponse | { error?: string };
      if (!response.ok) {
        const errBody = body as { error?: string };
        throw new Error(errBody.error ?? "No se pudo generar el briefing.");
      }
      setBriefing((body as BriefingResponse).narrative);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error generando el briefing.";
      setBriefingError(message);
    } finally {
      setBriefingBusy(false);
    }
  }

  if (loading) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        Loading your day…
      </p>
    );
  }

  const openWork = (data?.pending.length ?? 0) + (data?.waitingFor.length ?? 0);
  const freeMinutes = (data?.today.free ?? []).reduce((sum, block) => sum + block.minutes, 0);
  const overdue = (data?.attention ?? []).filter((item) => item.reason === "overdue").length;
  const meetings = data?.today.events.length ?? 0;
  const next = data?.recommendation[0] ?? null;

  return (
    <div className="grid min-w-0 gap-3 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
      <div className="grid min-w-0 content-start gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-balance">
              {greeting(data ? new Date(data.generatedAt) : undefined)}, {displayName(email)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Stay on top of your work, monitor progress, and track what is waiting.
            </p>
          </div>
          <label className="relative sm:w-64">
            <span className="sr-only">Search work</span>
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              name="dashboard-search"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search work…"
              className="h-10 w-full rounded-full bg-card pr-4 pl-9 text-sm ring-1 ring-foreground/10 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:outline-none"
            />
          </label>
        </div>

        <div aria-live="polite">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <Panel className="flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Open work</h2>
                <p className="text-xs text-muted-foreground">
                  Everything actionable, all sources.
                </p>
              </div>
              <TaskForm onSaved={reload} triggerLabel="Add new" />
            </div>

            <div className="mt-5">
              <p className="text-4xl font-semibold tracking-tight tabular-nums">
                {openWork}
                <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
                  items
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDuration(freeMinutes)} of focus time left today
              </p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <Chip href="/tasks" icon={ListChecks} label="Tasks" value={data?.pending.length ?? 0} />
              <Chip href="/waiting" icon={Hourglass} label="Waiting" value={data?.waitingFor.length ?? 0} />
              <Chip href="/calendar" icon={CalendarDays} label="Meetings" value={meetings} />
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-3">
            <Stat
              icon={Flame}
              tone="text-destructive"
              label="Attention"
              value={String(data?.attention.length ?? 0)}
              hint={overdue > 0 ? `${overdue} overdue` : "nothing overdue"}
            />
            <Stat
              icon={ListChecks}
              tone="text-foreground"
              label="Pending"
              value={String(data?.pending.length ?? 0)}
              hint="open tasks"
            />
            <Stat
              icon={Hourglass}
              tone="text-foreground"
              label="Waiting for"
              value={String(data?.waitingFor.length ?? 0)}
              hint="people or systems"
            />
            <Stat
              icon={Clock}
              tone="text-foreground"
              label="Free today"
              value={formatDuration(freeMinutes)}
              hint={`${meetings} meetings`}
            />
          </div>
        </div>

        <Panel>
          <PanelHeader
            title="Today"
            subtitle={data ? formatLongDate(data.generatedAt, data.timezone) : undefined}
            trailing={
              <button
                type="button"
                onClick={syncCalendar}
                disabled={isPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none disabled:opacity-60"
              >
                <RefreshCw
                  aria-hidden="true"
                  className={cn(
                    "size-3.5",
                    isPending && "animate-spin motion-reduce:animate-none",
                  )}
                />
                {isPending ? "Syncing…" : "Sync"}
              </button>
            }
          />

          {data ? (
            <DayStrip busy={data.today.busy} free={data.today.free} timezone={data.timezone} />
          ) : null}

          <div className="mt-4 grid gap-2">
            {meetings === 0 ? (
              <EmptyHint>
                No timed meetings today. Connect Outlook or Google Calendar in{" "}
                <Link href="/settings" className="underline">
                  Settings
                </Link>{" "}
                to fill this.
              </EmptyHint>
            ) : (
              data?.today.events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-2xl bg-muted/40 px-3 py-2.5"
                >
                  <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">
                    {formatTime(event.startAt, data.timezone)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {event.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatTime(event.endAt, data.timezone)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Panel className="min-w-0">
            <PanelHeader title="Attention" subtitle="Overdue, due today, starting soon" />
            <div className="grid w-full min-w-0 gap-2">
              {filtered.attention.length === 0 ? (
                <EmptyHint>Nothing needs immediate attention.</EmptyHint>
              ) : (
                filtered.attention.map((item: AttentionItem) => (
                  <div
                    key={`${item.reason}-${item.id}`}
                    className={cn(
                      "flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-2xl bg-muted/40 px-3 py-2.5",
                      query !== deferredQuery && "opacity-70",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-7 shrink-0 items-center justify-center"
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          item.reason === "overdue"
                            ? "bg-destructive"
                            : "bg-muted-foreground/50",
                        )}
                      />
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate text-sm font-medium"
                      title={item.title}
                    >
                      {truncateText(item.title, DASHBOARD_TASK_TITLE_MAX)}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        item.reason === "overdue"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-brand/25 text-brand-accent",
                      )}
                    >
                      {reasonLabel(item.reason)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel className="min-w-0">
            <PanelHeader
              title="Pending"
              subtitle="Manual tasks, Jira, Zoho Desk, and GitHub."
              trailing={
                <Link
                  href="/tasks"
                  className="inline-flex items-center gap-1 rounded-full text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                >
                  All <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              }
            />
            <form onSubmit={capture} className="mb-3 flex gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">New task title</span>
                <input
                  name="quick-capture"
                  autoComplete="off"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Quick capture, e.g. Reply to Ana…"
                  className="h-9 w-full rounded-full bg-muted px-3.5 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:outline-none"
                />
              </label>
              <button
                type="submit"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                aria-label="Capture task"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </form>
            <div className="grid w-full min-w-0 gap-2">
              {filtered.pending.length === 0 ? (
                <EmptyHint>No open tasks.</EmptyHint>
              ) : (
                filtered.pending
                  .slice(0, 5)
                  .map((item: WorkItemWithOverlay) => (
                    <TaskRow
                      key={item.id}
                      item={item}
                      timezone={data!.timezone}
                      onChanged={reload}
                      maxTitleLength={DASHBOARD_TASK_TITLE_MAX}
                      compact
                    />
                  ))
              )}
            </div>
          </Panel>
        </div>
      </div>

      <aside className="grid min-w-0 content-start gap-3">
        <Panel>
          <PanelHeader
            title="Briefing del día"
            subtitle="Resumen con Gemini de tu snapshot actual"
            trailing={
              <button
                type="button"
                onClick={() => void generateBriefing()}
                disabled={briefingBusy}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand px-3 text-xs font-semibold text-brand-foreground transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none disabled:opacity-60"
              >
                <Sparkles
                  aria-hidden="true"
                  className={cn(
                    "size-3.5",
                    briefingBusy && "animate-pulse motion-reduce:animate-none",
                  )}
                />
                {briefingBusy ? "Generando…" : briefing ? "Regenerar" : "Generar"}
              </button>
            }
          />
          {briefingError ? (
            <p role="alert" className="text-sm text-destructive">
              {briefingError}
            </p>
          ) : briefing ? (
            <div className="rounded-2xl bg-muted/40 px-3.5 py-3 text-sm leading-6 whitespace-pre-wrap text-foreground">
              {briefing}
            </div>
          ) : (
            <EmptyHint>
              Pulsa Generar para un resumen en español de atención, pendientes, agenda y siguiente
              mejor tarea. Requiere GEMINI_API_KEY en el servidor.
            </EmptyHint>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Waiting on" subtitle="People and systems blocking you" />
          {filtered.waitingFor.length === 0 ? (
            <EmptyHint>Nothing is blocked on someone else.</EmptyHint>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filtered.waitingFor.slice(0, 8).map((item) => (
                <Link
                  key={item.id}
                  href="/waiting"
                  title={`${item.overlay?.waitingForPerson ?? item.title}`}
                  aria-label={`Waiting on ${item.overlay?.waitingForPerson ?? item.title}`}
                  className="flex size-10 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground ring-1 ring-foreground/5 transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                >
                  {initials(item.overlay?.waitingForPerson ?? item.title)}
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="bg-foreground text-background ring-0">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium tracking-wide text-background/60 uppercase">
              Do this first
            </span>
            <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-brand-foreground">
              Rules
            </span>
          </div>
          {next ? (
            <>
              <p className="mt-6 text-lg leading-snug font-semibold">{next.title}</p>
              <p className="mt-2 text-sm text-background/70">{next.why}</p>
              {next.suggestedBlock ? (
                <p className="mt-4 text-xs text-background/60 tabular-nums">
                  Suggested block {formatTime(next.suggestedBlock.startAt, data!.timezone)} –{" "}
                  {formatTime(next.suggestedBlock.endAt, data!.timezone)}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-6 text-sm text-background/70">
              Add a task or sync your calendar and a ranked next action appears here.
            </p>
          )}
        </Panel>

        <div className="grid grid-cols-2 gap-2">
          <TaskForm onSaved={reload} triggerLabel="Add task" triggerClassName="w-full" />
          <button
            type="button"
            onClick={syncCalendar}
            disabled={isPending}
            className="inline-flex h-9 items-center justify-center rounded-full bg-card text-sm font-medium ring-1 ring-foreground/10 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none disabled:opacity-60"
          >
            {isPending ? "Syncing…" : "Sync calendar"}
          </button>
        </div>

        <Panel>
          <PanelHeader title="Quick action" />
          <div className="grid grid-cols-3 gap-2">
            <ActionTile href="/tasks" icon={ListChecks} label="Tasks" />
            <ActionTile href="/waiting" icon={Hourglass} label="Waiting" />
            <ActionTile href="/settings" icon={MoreHorizontal} label="More" />
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold tracking-tight">Next slices</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Jira, Zoho Desk, and GitHub are live. Outlook triage and AI are still queued.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
          >
            Manage Connections
          </Link>
        </Panel>
      </aside>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  tone: string;
}) {
  return (
    <Panel>
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon aria-hidden="true" className={cn("size-3.5", tone)} />
        </span>
        <span className="truncate text-sm font-medium">{label}</span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="truncate text-xs text-muted-foreground">{hint}</p>
    </Panel>
  );
}

function Chip({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="min-w-0 rounded-2xl bg-muted/60 px-3 py-2.5 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
    >
      <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
      <p className="mt-2 text-sm font-semibold tabular-nums">{value}</p>
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
    </Link>
  );
}

function ActionTile({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted/60 py-3 text-xs font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
    >
      <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
      {label}
    </Link>
  );
}
