"use client";

import { Check, Trash2 } from "lucide-react";
import { TaskForm } from "@/components/task-form-lazy";
import type { WorkItemWithOverlay } from "@/domain/types";
import { formatDateTime } from "@/lib/format";
import { truncateText } from "@/lib/display";
import { cn } from "@/lib/utils";

const priorityTone: Record<string, string> = {
  urgent: "bg-destructive/10 text-destructive",
  high: "bg-destructive/10 text-destructive",
  medium: "bg-muted text-muted-foreground",
  low: "bg-muted text-muted-foreground",
  none: "bg-muted text-muted-foreground",
};

export function TaskRow({
  item,
  timezone,
  onChanged,
  maxTitleLength,
  compact = false,
}: {
  item: WorkItemWithOverlay;
  timezone: string;
  onChanged: () => void;
  maxTitleLength?: number;
  compact?: boolean;
}) {
  async function complete() {
    await fetch(`/api/tasks/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    onChanged();
  }

  async function remove() {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    await fetch(`/api/tasks/${item.id}`, { method: "DELETE" });
    onChanged();
  }

  const waiting = item.overlay?.waitingForPerson;

  const isManual = item.source === "manual";
  const displayTitle =
    maxTitleLength !== undefined ? truncateText(item.title, maxTitleLength) : item.title;

  return (
    <div
      className={cn(
        "group flex w-full min-w-0 items-start overflow-hidden rounded-2xl bg-muted/40 px-3 py-2.5",
        compact ? "gap-2" : "gap-3",
      )}
    >
      {isManual ? (
        <button
          type="button"
          onClick={complete}
          aria-label={`Mark “${item.title}” done`}
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-foreground/10 transition-colors hover:bg-brand hover:text-brand-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
        >
          <Check className="size-3.5" aria-hidden="true" />
        </button>
      ) : (
        // Keeps titles aligned with manual rows, which carry a complete button
        // in this slot, without leaving the gutter visually empty.
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center"
        >
          <span className="size-1.5 rounded-full bg-muted-foreground/50" />
        </span>
      )}

      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium" title={item.title}>{displayTitle}</p>
        {!compact ? (
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] tracking-wide uppercase",
                priorityTone[item.priority] ?? priorityTone.none,
              )}
            >
              {item.priority}
            </span>
            <span className="min-w-0 truncate">
              {item.source === "manual" ? "Manual" : item.source}
              {item.dueAt ? ` · due ${formatDateTime(item.dueAt, timezone)}` : ""}
              {waiting ? ` · waiting on ${waiting}` : ""}
            </span>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-0.5 flex shrink-0 items-center gap-1",
          compact
            ? "opacity-100"
            : "opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100",
        )}
      >
        <TaskForm item={item} triggerLabel="Edit task" onSaved={onChanged} />
        {isManual ? (
          <button
            type="button"
            onClick={remove}
            aria-label={`Delete “${item.title}”`}
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:outline-none"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
