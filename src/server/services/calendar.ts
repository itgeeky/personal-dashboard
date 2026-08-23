import type { SupabaseClient } from "@supabase/supabase-js";
import {
  endOfLocalDay,
  eventsOnLocalDay,
  freeBlocks,
  startOfLocalDay,
  workWindow,
} from "@/domain/calendar";
import type { CalendarEvent, TimeBlock } from "@/domain/types";
import { toCalendarEvent, type CalendarEventRow } from "@/lib/db/types";
import type { NormalizedCalendarEvent } from "@/server/connectors/types";

export async function listCalendarEvents(
  supabase: SupabaseClient,
  userId: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", userId)
    .lt("start_at", rangeEnd.toISOString())
    .gt("end_at", rangeStart.toISOString())
    .order("start_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as CalendarEventRow[]).map(toCalendarEvent);
}

export async function upsertCalendarEvents(
  supabase: SupabaseClient,
  userId: string,
  source: CalendarEvent["source"],
  events: NormalizedCalendarEvent[],
) {
  if (events.length === 0) return;
  const rows = events.map((event) => ({
    user_id: userId,
    source,
    external_id: event.externalId,
    title: event.title,
    start_at: event.startAt,
    end_at: event.endAt,
    is_all_day: event.isAllDay,
    location: event.location,
    raw: event.raw ?? null,
  }));
  const { error } = await supabase.from("calendar_events").upsert(rows, {
    onConflict: "user_id,source,external_id",
  });
  if (error) throw error;
}

export function agendaForDay(events: CalendarEvent[], now: Date, timeZone: string) {
  const dayEvents = eventsOnLocalDay(events, now, timeZone);
  const window = workWindow(now, timeZone);
  const busy = dayEvents.map((event) => ({
    startAt: event.startAt,
    endAt: event.endAt,
    minutes: Math.round(
      (new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / 60_000,
    ),
  }));
  const free = freeBlocks(busy, window.start, window.end);
  return { events: dayEvents, busy, free };
}

export function eventsInLocalRange(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
  timeZone: string,
): CalendarEvent[] {
  const start = startOfLocalDay(rangeStart, timeZone).getTime();
  const end = endOfLocalDay(rangeEnd, timeZone).getTime();
  return events
    .filter((event) => {
      const eventStart = new Date(event.startAt).getTime();
      const eventEnd = new Date(event.endAt).getTime();
      return eventStart < end && eventEnd > start;
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export function agendaForRange(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
  timeZone: string,
) {
  const days: Array<{
    date: string;
    events: CalendarEvent[];
    busy: TimeBlock[];
    free: TimeBlock[];
  }> = [];

  let cursor = startOfLocalDay(rangeStart, timeZone);
  const end = endOfLocalDay(rangeEnd, timeZone);

  while (cursor.getTime() <= end.getTime()) {
    const agenda = agendaForDay(events, cursor, timeZone);
    days.push({
      date: cursor.toISOString(),
      events: agenda.events,
      busy: agenda.busy,
      free: agenda.free,
    });
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return {
    timezone: timeZone,
    rangeStart: startOfLocalDay(rangeStart, timeZone).toISOString(),
    rangeEnd: endOfLocalDay(rangeEnd, timeZone).toISOString(),
    days,
  };
}
