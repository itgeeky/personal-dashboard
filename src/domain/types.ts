import type {
  CalendarSource,
  ConnectorProvider,
  TaskSource,
  WorkItemKind,
  WorkItemPriority,
  WorkItemStatus,
} from "./enums";

/** Normalized snapshot of work. Source systems remain canonical for source-owned fields. */
export type WorkItem = {
  id: string;
  userId: string;
  source: TaskSource;
  kind: WorkItemKind;
  externalId: string | null;
  title: string;
  description: string | null;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  dueAt: string | null;
  estimatedMinutes: number | null;
  tags: string[];
  relatedPerson: string | null;
  relatedProject: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  raw: unknown | null;
};

/** Cockpit-only state. Never written back to Jira/Zoho/mail. */
export type WorkItemOverlay = {
  workItemId: string;
  userId: string;
  snoozeUntil: string | null;
  ignoredAt: string | null;
  nextAction: string | null;
  notes: string | null;
  reminderAt: string | null;
  waitingForPerson: string | null;
  waitingForExpected: string | null;
  waitingSince: string | null;
  lastFollowUpAt: string | null;
  suggestedFollowUpAt: string | null;
};

export type WorkItemWithOverlay = WorkItem & { overlay: WorkItemOverlay | null };

export type CalendarEvent = {
  id: string;
  userId: string;
  source: CalendarSource;
  externalId: string;
  title: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  location: string | null;
};

export type TimeBlock = {
  startAt: string;
  endAt: string;
  minutes: number;
};

export type TodayAgenda = {
  events: CalendarEvent[];
  busy: TimeBlock[];
  free: TimeBlock[];
};

export type Connection = {
  id: string;
  userId: string;
  provider: ConnectorProvider;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type SyncCursor = {
  provider: ConnectorProvider;
  cursor: string | null;
  lastSyncedAt: string | null;
};

export type AttentionReason =
  | "overdue"
  | "due_today"
  | "meeting_soon"
  | "waiting_too_long"
  | "reminder_due";

export type AttentionItem = {
  id: string;
  title: string;
  reason: AttentionReason;
  score: number;
  dueAt: string | null;
  source: TaskSource | CalendarSource;
};

export type RecommendationItem = {
  rank: number;
  workItemId: string | null;
  eventId: string | null;
  title: string;
  why: string;
  score: number;
  suggestedBlock: TimeBlock | null;
};

export type DashboardSnapshot = {
  generatedAt: string;
  timezone: string;
  attention: AttentionItem[];
  pending: WorkItemWithOverlay[];
  waitingFor: WorkItemWithOverlay[];
  inbox: WorkItemWithOverlay[];
  today: TodayAgenda;
  recommendation: RecommendationItem[];
};

export type CreateManualTaskInput = {
  title: string;
  description?: string | null;
  priority?: WorkItemPriority;
  status?: WorkItemStatus;
  dueAt?: string | null;
  estimatedMinutes?: number | null;
  tags?: string[];
  relatedPerson?: string | null;
  relatedProject?: string | null;
  notes?: string | null;
  reminderAt?: string | null;
  waitingForPerson?: string | null;
  waitingForExpected?: string | null;
};
