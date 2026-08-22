"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EmptyHint, Panel, PanelHeader } from "@/components/panel";
import { PageHeader } from "@/components/page-header";
import { TaskForm } from "@/components/task-form-lazy";
import { TaskRow } from "@/components/task-row";
import type { DashboardSnapshot } from "@/domain/types";
import { useDashboard } from "@/lib/use-dashboard";
import { cn } from "@/lib/utils";

type Filter = "all" | "attention" | "waiting";

export function TasksClient({ initialData }: { initialData?: DashboardSnapshot | null }) {
  const { data, loading, error, reload } = useDashboard(initialData);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [filter, setFilter] = useState<Filter>("all");

  const attentionIds = useMemo(
    () => new Set((data?.attention ?? []).map((item) => item.id)),
    [data],
  );

  const items = useMemo(() => {
    if (!data) return [];
    const base =
      filter === "waiting"
        ? data.waitingFor
        : filter === "attention"
          ? [...data.pending, ...data.waitingFor].filter((item) => attentionIds.has(item.id))
          : [...data.pending, ...data.waitingFor];
    const needle = deferredQuery.trim().toLowerCase();
    return needle ? base.filter((item) => item.title.toLowerCase().includes(needle)) : base;
  }, [data, filter, deferredQuery, attentionIds]);

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Manual tasks, Jira, Zoho, and GitHub work. External status is not overwritten here."
        actions={<TaskForm onSaved={reload} triggerLabel="Add task" />}
      />

      <Panel>
        <PanelHeader
          title="All open work"
          subtitle={`${items.length} shown`}
          trailing={
            <label className="relative block w-44">
              <span className="sr-only">Search tasks</span>
              <Search
                aria-hidden="true"
                className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                name="task-search"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-8 w-full rounded-full bg-muted pr-3 pl-8 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:outline-none"
              />
            </label>
          }
        />

        <div role="tablist" aria-label="Task filter" className="mb-3 flex gap-1">
          {(["all", "attention", "waiting"] as Filter[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none",
                filter === value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {value}
            </button>
          ))}
        </div>

        <div aria-live="polite">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <div
          style={{ contentVisibility: "auto", containIntrinsicSize: "auto 3.25rem" }}
          className={cn("grid gap-2", query !== deferredQuery && "opacity-70")}
        >
          {loading ? (
            <EmptyHint>Loading tasks…</EmptyHint>
          ) : items.length === 0 ? (
            <EmptyHint>No tasks match this view.</EmptyHint>
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
    </>
  );
}
