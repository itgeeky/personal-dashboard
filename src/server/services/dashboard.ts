import type { SupabaseClient } from "@supabase/supabase-js";
import {
  attentionItems,
  recommendNext,
  pendingTasks,
  waitingForTasks,
} from "@/domain/rules";
import type { DashboardSnapshot } from "@/domain/types";
import { userTimeZone } from "@/lib/env";
import { agendaForDay, listCalendarEvents } from "./calendar";
import { listWorkItems } from "./tasks";

export async function buildDashboard(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<DashboardSnapshot> {
  const timeZone = userTimeZone();
  const dayStart = new Date(now);
  dayStart.setDate(dayStart.getDate() - 1);
  const dayEnd = new Date(now);
  dayEnd.setDate(dayEnd.getDate() + 2);

  const [items, events] = await Promise.all([
    listWorkItems(supabase, userId),
    listCalendarEvents(supabase, userId, dayStart, dayEnd),
  ]);

  const today = agendaForDay(events, now, timeZone);

  return {
    generatedAt: now.toISOString(),
    timezone: timeZone,
    attention: attentionItems(items, events, now, timeZone),
    pending: pendingTasks(items, now),
    waitingFor: waitingForTasks(items, now),
    today,
    recommendation: recommendNext(items, events, now, timeZone),
  };
}
