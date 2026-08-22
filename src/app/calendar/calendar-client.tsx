"use client";

import { useTransition } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { DayStrip } from "@/components/day-strip";
import { EmptyHint, Panel, PanelHeader } from "@/components/panel";
import { PageHeader } from "@/components/page-header";
import type { DashboardSnapshot } from "@/domain/types";
import { formatDuration, formatLongDate } from "@/lib/display";
import { formatTime } from "@/lib/format";
import { useDashboard } from "@/lib/use-dashboard";
import { cn } from "@/lib/utils";

export function CalendarClient({ initialData }: { initialData?: DashboardSnapshot | null }) {
  const { data, loading, error, reload, setError } = useDashboard(initialData);
  const [isPending, startTransition] = useTransition();

  function sync() {
    startTransition(async () => {
      const response = await fetch("/api/calendar/sync", { method: "POST" });
      if (!response.ok) {
        setError("Sync failed. Connect Outlook or Google Calendar in Settings first.");
        return;
      }
      await reload();
    });
  }

  const freeMinutes = (data?.today.free ?? []).reduce((sum, block) => sum + block.minutes, 0);
  const busyMinutes = (data?.today.busy ?? []).reduce((sum, block) => sum + block.minutes, 0);

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="Time context only. Meetings never become tasks on their own."
        actions={
          <button
            type="button"
            onClick={sync}
            disabled={isPending}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-medium text-brand-foreground transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none disabled:opacity-60"
          >
            <RefreshCw
              aria-hidden="true"
              className={cn("size-4", isPending && "animate-spin motion-reduce:animate-none")}
            />
            {isPending ? "Syncing…" : "Sync Now"}
          </button>
        }
      />

      <div aria-live="polite">
        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel>
          <PanelHeader
            title="Agenda"
            subtitle={data ? formatLongDate(data.generatedAt, data.timezone) : undefined}
          />
          {data ? (
            <DayStrip busy={data.today.busy} free={data.today.free} timezone={data.timezone} />
          ) : null}
          <div className="mt-4 grid gap-2">
            {loading ? (
              <EmptyHint>Loading agenda…</EmptyHint>
            ) : (data?.today.events.length ?? 0) === 0 ? (
              <EmptyHint>
                No timed meetings today. Connect Outlook or Google Calendar in{" "}
                <Link href="/settings" className="underline">
                  Settings
                </Link>
                .
              </EmptyHint>
            ) : (
              data?.today.events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-2xl bg-muted/40 px-3 py-2.5"
                >
                  <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                    {formatTime(event.startAt, data.timezone)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{event.title}</p>
                    {event.location ? (
                      <p className="truncate text-xs text-muted-foreground">{event.location}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatTime(event.endAt, data.timezone)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <div className="grid content-start gap-3">
          <Panel>
            <PanelHeader title="Capacity" subtitle="Work window 08:00 to 18:00" />
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatDuration(freeMinutes)}
            </p>
            <p className="text-xs text-muted-foreground">
              free · {formatDuration(busyMinutes)} in meetings
            </p>
          </Panel>

          <Panel>
            <PanelHeader title="Free blocks" />
            {(data?.today.free.length ?? 0) === 0 ? (
              <EmptyHint>No free blocks left in the work window.</EmptyHint>
            ) : (
              <div className="grid gap-2">
                {data?.today.free.map((block) => (
                  <div
                    key={block.startAt}
                    className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2 text-sm tabular-nums"
                  >
                    <span>
                      {formatTime(block.startAt, data.timezone)}–
                      {formatTime(block.endAt, data.timezone)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(block.minutes)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
