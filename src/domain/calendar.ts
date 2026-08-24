import type { CalendarEvent, TimeBlock } from "./types";

const MS_MINUTE = 60_000;

export function startOfLocalDay(date: Date, timeZone: string): Date {
  const parts = localDateParts(date, timeZone);
  return zonedDateTime(parts.year, parts.month, parts.day, 0, 0, timeZone);
}

export function endOfLocalDay(date: Date, timeZone: string): Date {
  const parts = localDateParts(date, timeZone);
  return zonedDateTime(parts.year, parts.month, parts.day, 23, 59, timeZone);
}

/** Work window used for free-block math (not sleeping hours). */
export function workWindow(date: Date, timeZone: string): { start: Date; end: Date } {
  const parts = localDateParts(date, timeZone);
  return {
    start: zonedDateTime(parts.year, parts.month, parts.day, 8, 0, timeZone),
    end: zonedDateTime(parts.year, parts.month, parts.day, 18, 0, timeZone),
  };
}

export function eventsOnLocalDay(
  events: CalendarEvent[],
  date: Date,
  timeZone: string,
): CalendarEvent[] {
  const start = startOfLocalDay(date, timeZone).getTime();
  const end = endOfLocalDay(date, timeZone).getTime();
  return events
    .filter((event) => {
      const s = new Date(event.startAt).getTime();
      const e = new Date(event.endAt).getTime();
      return s < end && e > start && !event.isAllDay;
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export function busyBlocks(events: CalendarEvent[]): TimeBlock[] {
  return mergeBlocks(
    events.map((event) => toBlock(event.startAt, event.endAt)),
  );
}

export function freeBlocks(
  busy: TimeBlock[],
  windowStart: Date,
  windowEnd: Date,
  minMinutes = 25,
): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  let cursor = windowStart.getTime();
  const end = windowEnd.getTime();

  const clipped = busy
    .map((block) => ({
      start: Math.max(new Date(block.startAt).getTime(), cursor),
      end: Math.min(new Date(block.endAt).getTime(), end),
    }))
    .filter((block) => block.end > block.start)
    .sort((a, b) => a.start - b.start);

  for (const block of clipped) {
    if (block.start - cursor >= minMinutes * MS_MINUTE) {
      blocks.push(toBlock(new Date(cursor).toISOString(), new Date(block.start).toISOString()));
    }
    cursor = Math.max(cursor, block.end);
  }

  if (end - cursor >= minMinutes * MS_MINUTE) {
    blocks.push(toBlock(new Date(cursor).toISOString(), new Date(end).toISOString()));
  }

  return blocks;
}

function mergeBlocks(blocks: TimeBlock[]): TimeBlock[] {
  const sorted = [...blocks].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const merged: TimeBlock[] = [];
  for (const block of sorted) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push(block);
      continue;
    }
    if (new Date(block.startAt).getTime() <= new Date(last.endAt).getTime()) {
      const end =
        new Date(block.endAt).getTime() > new Date(last.endAt).getTime()
          ? block.endAt
          : last.endAt;
      merged[merged.length - 1] = toBlock(last.startAt, end);
    } else {
      merged.push(block);
    }
  }
  return merged;
}

function toBlock(startAt: string, endAt: string): TimeBlock {
  return {
    startAt,
    endAt,
    minutes: Math.max(
      0,
      Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / MS_MINUTE),
    ),
  };
}

function localDateParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function zonedDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const asLocal = localDateParts(new Date(utcGuess), timeZone);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  const actual = Date.UTC(
    asLocal.year,
    asLocal.month - 1,
    asLocal.day,
    asLocal.hour,
    asLocal.minute,
  );
  return new Date(utcGuess + (desired - actual));
}

/**
 * Converts a local wall-clock spec ("YYYY-MM-DD HH:mm", also accepts "T" separator)
 * into an absolute instant, so callers (including the LLM agent) never have to do
 * UTC-offset arithmetic themselves — that arithmetic is what produced the
 * wrong-day/wrong-time bug for evening events crossing the UTC date boundary.
 */
export function localDateTimeToIso(value: string, timeZone: string): string {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) {
    throw new Error(`Formato de fecha/hora inválido: "${value}". Usa "YYYY-MM-DD HH:mm".`);
  }
  const [, year, month, day, hour, minute] = match;
  return zonedDateTime(
    Number(year),
    Number(month),
    Number(day),
    Number(hour),
    Number(minute),
    timeZone,
  ).toISOString();
}

export function localTimeLabel(iso: string | Date, timeZone: string): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function localDateLabel(iso: string | Date, timeZone: string): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

/** Renders an event with explicit local wall-clock fields so the LLM never has to convert UTC itself. */
export function localizeEvent(event: CalendarEvent, timeZone: string) {
  return {
    title: event.title,
    date: localDateLabel(event.startAt, timeZone),
    start: event.isAllDay ? "todo el día" : localTimeLabel(event.startAt, timeZone),
    end: event.isAllDay ? "todo el día" : localTimeLabel(event.endAt, timeZone),
    location: event.location,
    source: event.source,
  };
}

export function localizeBlock(block: TimeBlock, timeZone: string) {
  return {
    start: localTimeLabel(block.startAt, timeZone),
    end: localTimeLabel(block.endAt, timeZone),
    minutes: block.minutes,
  };
}
