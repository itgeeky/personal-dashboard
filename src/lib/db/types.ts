import type { CalendarEvent, WorkItem, WorkItemOverlay, WorkItemWithOverlay } from "@/domain/types";

export type WorkItemRow = {
  id: string;
  user_id: string;
  source: WorkItem["source"];
  kind: WorkItem["kind"];
  external_id: string | null;
  title: string;
  description: string | null;
  status: WorkItem["status"];
  priority: WorkItem["priority"];
  due_at: string | null;
  estimated_minutes: number | null;
  tags: string[];
  related_person: string | null;
  related_project: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type OverlayRow = {
  work_item_id: string;
  user_id: string;
  snooze_until: string | null;
  ignored_at: string | null;
  next_action: string | null;
  notes: string | null;
  reminder_at: string | null;
  waiting_for_person: string | null;
  waiting_for_expected: string | null;
  waiting_since: string | null;
  last_follow_up_at: string | null;
  suggested_follow_up_at: string | null;
};

export type CalendarEventRow = {
  id: string;
  user_id: string;
  source: CalendarEvent["source"];
  external_id: string;
  title: string;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  location: string | null;
};

export function toWorkItem(row: WorkItemRow): WorkItem {
  return {
    id: row.id,
    userId: row.user_id,
    source: row.source,
    kind: row.kind,
    externalId: row.external_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueAt: row.due_at,
    estimatedMinutes: row.estimated_minutes,
    tags: row.tags ?? [],
    relatedPerson: row.related_person,
    relatedProject: row.related_project,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export function toOverlay(row: OverlayRow): WorkItemOverlay {
  return {
    workItemId: row.work_item_id,
    userId: row.user_id,
    snoozeUntil: row.snooze_until,
    ignoredAt: row.ignored_at,
    nextAction: row.next_action,
    notes: row.notes,
    reminderAt: row.reminder_at,
    waitingForPerson: row.waiting_for_person,
    waitingForExpected: row.waiting_for_expected,
    waitingSince: row.waiting_since,
    lastFollowUpAt: row.last_follow_up_at,
    suggestedFollowUpAt: row.suggested_follow_up_at,
  };
}

export function mergeItems(
  items: WorkItemRow[],
  overlays: OverlayRow[],
): WorkItemWithOverlay[] {
  const byId = new Map(overlays.map((row) => [row.work_item_id, toOverlay(row)]));
  return items.map((row) => ({
    ...toWorkItem(row),
    overlay: byId.get(row.id) ?? null,
  }));
}

export function toCalendarEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    userId: row.user_id,
    source: row.source,
    externalId: row.external_id,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    isAllDay: row.is_all_day,
    location: row.location,
  };
}
