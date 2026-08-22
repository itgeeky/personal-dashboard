"use client";

import type { TimeBlock } from "@/domain/types";
import { formatTime } from "@/lib/format";

/**
 * Busy/free ribbon across the work window. Positions come from the same
 * deterministic blocks the recommendation uses, so the strip cannot drift
 * from the ranking.
 */
export function DayStrip({
  busy,
  free,
  timezone,
}: {
  busy: TimeBlock[];
  free: TimeBlock[];
  timezone: string;
}) {
  const all = [...busy, ...free];
  if (all.length === 0) return null;

  const starts = all.map((block) => new Date(block.startAt).getTime());
  const ends = all.map((block) => new Date(block.endAt).getTime());
  const windowStart = Math.min(...starts);
  const windowEnd = Math.max(...ends);
  const span = windowEnd - windowStart;
  if (span <= 0) return null;

  const position = (block: TimeBlock) => {
    const start = new Date(block.startAt).getTime();
    const end = new Date(block.endAt).getTime();
    return {
      left: `${((start - windowStart) / span) * 100}%`,
      width: `${((end - start) / span) * 100}%`,
    };
  };

  const now = Date.now();
  const nowVisible = now >= windowStart && now <= windowEnd;

  return (
    <div>
      <div
        role="img"
        aria-label={`Day timeline: ${busy.length} busy blocks, ${free.length} free blocks between ${formatTime(new Date(windowStart).toISOString(), timezone)} and ${formatTime(new Date(windowEnd).toISOString(), timezone)}`}
        className="relative h-9 overflow-hidden rounded-xl bg-muted"
      >
        {free.map((block) => (
          <div
            key={`free-${block.startAt}`}
            className="absolute inset-y-0 bg-brand/70"
            style={position(block)}
            title={`Free ${block.minutes}m`}
          />
        ))}
        {busy.map((block) => (
          <div
            key={`busy-${block.startAt}`}
            className="absolute inset-y-0 bg-foreground/85"
            style={position(block)}
            title={`Busy ${block.minutes}m`}
          />
        ))}
        {nowVisible ? (
          <div
            className="absolute inset-y-0 w-0.5 bg-destructive"
            style={{ left: `${((now - windowStart) / span) * 100}%` }}
            title="Now"
          />
        ) : null}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{formatTime(new Date(windowStart).toISOString(), timezone)}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-full bg-foreground/85" />
            Busy
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-full bg-brand" />
            Free
          </span>
        </span>
        <span>{formatTime(new Date(windowEnd).toISOString(), timezone)}</span>
      </div>
    </div>
  );
}
