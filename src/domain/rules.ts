import { eventsOnLocalDay, freeBlocks, startOfLocalDay, workWindow } from "./calendar";
import type { WorkItemStatus } from "./enums";
import type {
  AttentionItem,
  CalendarEvent,
  RecommendationItem,
  TimeBlock,
  WorkItemWithOverlay,
} from "./types";

const WAITING_FOLLOW_UP_DAYS = 2;
const MEETING_SOON_MINUTES = 30;

const priorityWeight: Record<string, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 4,
  urgent: 6,
};

export function isSnoozed(item: WorkItemWithOverlay, now: Date): boolean {
  const until = item.overlay?.snoozeUntil;
  if (!until) return false;
  return new Date(until).getTime() > now.getTime();
}

export function isIgnored(item: WorkItemWithOverlay): boolean {
  return Boolean(item.overlay?.ignoredAt);
}

export function isActiveTask(item: WorkItemWithOverlay, now: Date): boolean {
  if (item.kind !== "task") return false;
  if (item.status === "done" || item.status === "cancelled") return false;
  if (isIgnored(item) || isSnoozed(item, now)) return false;
  return true;
}

export function pendingTasks(items: WorkItemWithOverlay[], now: Date): WorkItemWithOverlay[] {
  return items
    .filter((item) => isActiveTask(item, now) && item.status !== "waiting_for")
    .sort(compareUrgency);
}

export function waitingForTasks(
  items: WorkItemWithOverlay[],
  now: Date,
): WorkItemWithOverlay[] {
  return items
    .filter((item) => isActiveTask(item, now) && item.status === "waiting_for")
    .sort(compareUrgency);
}

export function attentionItems(
  items: WorkItemWithOverlay[],
  events: CalendarEvent[],
  now: Date,
  timeZone: string,
): AttentionItem[] {
  const result: AttentionItem[] = [];

  for (const item of items) {
    if (!isActiveTask(item, now)) continue;

    if (item.dueAt && new Date(item.dueAt).getTime() < startOfLocalDay(now, timeZone).getTime()) {
      result.push(toAttention(item, "overdue", 100 + priorityScore(item)));
    } else if (item.dueAt && isSameLocalDay(item.dueAt, now, timeZone)) {
      result.push(toAttention(item, "due_today", 70 + priorityScore(item)));
    }

    if (item.status === "waiting_for" && waitingTooLong(item, now)) {
      result.push(toAttention(item, "waiting_too_long", 55 + priorityScore(item)));
    }

    if (item.overlay?.reminderAt && new Date(item.overlay.reminderAt).getTime() <= now.getTime()) {
      result.push(toAttention(item, "reminder_due", 50 + priorityScore(item)));
    }
  }

  for (const event of eventsOnLocalDay(events, now, timeZone)) {
    const start = new Date(event.startAt).getTime();
    const delta = (start - now.getTime()) / 60_000;
    if (delta >= 0 && delta <= MEETING_SOON_MINUTES) {
      result.push({
        id: event.id,
        title: event.title,
        reason: "meeting_soon",
        score: 80,
        dueAt: event.startAt,
        source: event.source,
      });
    }
  }

  return result.sort((a, b) => b.score - a.score);
}

export function recommendNext(
  items: WorkItemWithOverlay[],
  events: CalendarEvent[],
  now: Date,
  timeZone: string,
): RecommendationItem[] {
  const window = workWindow(now, timeZone);
  const todayEvents = eventsOnLocalDay(events, now, timeZone);
  const free = freeBlocks(
    todayEvents.map((event) => ({
      startAt: event.startAt,
      endAt: event.endAt,
      minutes: Math.round(
        (new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / 60_000,
      ),
    })),
    now > window.start ? now : window.start,
    window.end,
  );

  const candidates = pendingTasks(items, now);
  const waiting = waitingForTasks(items, now).filter((item) => waitingTooLong(item, now));

  const scored: RecommendationItem[] = [];

  for (const item of [...waiting, ...candidates]) {
    const block = pickBlock(free, item.estimatedMinutes);
    scored.push({
      rank: 0,
      workItemId: item.id,
      eventId: null,
      title: item.title,
      why: explain(item, now, timeZone, block),
      score: recommendationScore(item, now, timeZone, block),
      suggestedBlock: block,
    });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function recommendationScore(
  item: WorkItemWithOverlay,
  now: Date,
  timeZone: string,
  block: TimeBlock | null,
): number {
  let score = priorityScore(item);
  if (item.dueAt && new Date(item.dueAt).getTime() < startOfLocalDay(now, timeZone).getTime()) score += 40;
  else if (item.dueAt && isSameLocalDay(item.dueAt, now, timeZone)) score += 25;
  if (item.status === "waiting_for") score += 15;
  if (item.overlay?.nextAction) score += 4;
  else score -= 2;
  if (item.estimatedMinutes && block && block.minutes >= item.estimatedMinutes) score += 8;
  if (item.estimatedMinutes && !block) score -= 6;
  const ageDays =
    (now.getTime() - new Date(item.createdAt).getTime()) / (24 * 60 * 60 * 1000);
  score += Math.min(10, Math.floor(ageDays));
  return score;
}

function explain(
  item: WorkItemWithOverlay,
  now: Date,
  timeZone: string,
  block: TimeBlock | null,
): string {
  if (item.status === "waiting_for") {
    const who = item.overlay?.waitingForPerson ?? "someone";
    return `Follow up: waiting on ${who}.`;
  }
  if (item.dueAt && new Date(item.dueAt).getTime() < startOfLocalDay(now, timeZone).getTime()) {
    return "Overdue — finish this before starting new work.";
  }
  if (item.dueAt && isSameLocalDay(item.dueAt, now, timeZone)) {
    return "Due today.";
  }
  if (block && item.estimatedMinutes && block.minutes >= item.estimatedMinutes) {
    return `Fits in a ${block.minutes}-minute free block.`;
  }
  if (item.overlay?.nextAction) {
    return `Next action: ${item.overlay.nextAction}`;
  }
  return "Open work with no later deadline than other candidates.";
}

function pickBlock(free: TimeBlock[], estimatedMinutes: number | null): TimeBlock | null {
  if (free.length === 0) return null;
  if (!estimatedMinutes) return free[0] ?? null;
  return free.find((block) => block.minutes >= estimatedMinutes) ?? free[0] ?? null;
}

function waitingTooLong(item: WorkItemWithOverlay, now: Date): boolean {
  const since = item.overlay?.waitingSince ?? item.updatedAt;
  const last = item.overlay?.lastFollowUpAt ?? since;
  const days = (now.getTime() - new Date(last).getTime()) / (24 * 60 * 60 * 1000);
  return days >= WAITING_FOLLOW_UP_DAYS;
}

function toAttention(
  item: WorkItemWithOverlay,
  reason: AttentionItem["reason"],
  score: number,
): AttentionItem {
  return {
    id: item.id,
    title: item.title,
    reason,
    score,
    dueAt: item.dueAt,
    source: item.source,
  };
}

function priorityScore(item: WorkItemWithOverlay): number {
  return (priorityWeight[item.priority] ?? 0) * 3;
}

function compareUrgency(a: WorkItemWithOverlay, b: WorkItemWithOverlay): number {
  const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  if (aDue !== bDue) return aDue - bDue;
  return priorityScore(b) - priorityScore(a);
}

function isSameLocalDay(iso: string, now: Date, timeZone: string): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(iso)) === fmt.format(now);
}

export function isOpenStatus(status: WorkItemStatus): boolean {
  return status === "open" || status === "in_progress" || status === "waiting_for";
}
