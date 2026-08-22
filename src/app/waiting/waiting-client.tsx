"use client";

import { EmptyHint, Panel, PanelHeader } from "@/components/panel";
import { PageHeader } from "@/components/page-header";
import { TaskForm } from "@/components/task-form-lazy";
import { TaskRow } from "@/components/task-row";
import type { DashboardSnapshot } from "@/domain/types";
import { initials } from "@/lib/display";
import { formatDateTime } from "@/lib/format";
import { useDashboard } from "@/lib/use-dashboard";

export function WaitingClient({ initialData }: { initialData?: DashboardSnapshot | null }) {
  const { data, loading, error, reload } = useDashboard(initialData);
  const items = data?.waitingFor ?? [];

  return (
    <>
      <PageHeader
        title="Waiting for"
        subtitle="Work that depends on another person or system."
        actions={<TaskForm onSaved={reload} triggerLabel="Add task" />}
      />

      <div aria-live="polite">
        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel>
          <PanelHeader title="Open dependencies" subtitle={`${items.length} tracked`} />
          <div className="grid gap-2">
            {loading ? (
              <EmptyHint>Loading…</EmptyHint>
            ) : items.length === 0 ? (
              <EmptyHint>
                Nothing is blocked. Set a task status to &quot;waiting for&quot; to track it here.
              </EmptyHint>
            ) : (
              items.map((item) => (
                <TaskRow
                  key={item.id}
                  item={item}
                  timezone={data!.timezone}
                  onChanged={reload}
                />
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Follow up" subtitle="Two days without contact is flagged" />
          {items.length === 0 ? (
            <EmptyHint>No follow-ups needed.</EmptyHint>
          ) : (
            <div className="grid gap-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
                  >
                    {initials(item.overlay?.waitingForPerson ?? item.title)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.overlay?.waitingForPerson ?? "Unassigned"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.overlay?.waitingSince
                        ? `since ${formatDateTime(item.overlay.waitingSince, data!.timezone)}`
                        : item.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
