import type { ConnectorProvider, TaskSource, WorkItemKind, WorkItemPriority, WorkItemStatus } from "./enums";
import type { CalendarEvent, WorkItem, WorkItemOverlay, WorkItemWithOverlay } from "./types";

/**
 * Routing rules for ingested items.
 *
 * - Jira / Zoho → kind `task` (known work queue).
 * - Outlook mail (and later Teams) → kind `inbox` until the user triages.
 * - Calendar → `calendar_events` only. Never auto-create tasks from meetings.
 * - Manual capture → kind `task`.
 */
export function kindForSource(source: TaskSource): WorkItemKind {
  switch (source) {
    case "jira":
    case "zoho_desk":
    case "github":
    case "gitlab":
    case "manual":
      return "task";
    case "outlook":
      return "inbox";
  }
}

export const implementedProviders: ConnectorProvider[] = [
  "google_calendar",
  "microsoft_calendar",
  "jira",
  "zoho_desk",
  "github",
];

export const deferredProviders: ConnectorProvider[] = ["outlook", "gitlab"];

export function isImplementedProvider(provider: ConnectorProvider): boolean {
  return implementedProviders.includes(provider);
}

// ---------------------------------------------------------------------------
// Mappers: payload crudo de cada fuente -> modelo normalizado (WorkItem / CalendarEvent)
// Sin I/O. `internalId` lo resuelve la capa de conector/repositorio (upsert por
// (userId, source, externalId) -> uuid interno) antes de llamar a estos mappers.
// ---------------------------------------------------------------------------

const JIRA_STATUS_MAP: Record<string, WorkItemStatus> = {
  "to do": "open",
  backlog: "open",
  "in progress": "in_progress",
  "in review": "in_progress",
  blocked: "waiting_for",
  done: "done",
  closed: "done",
  cancelled: "cancelled",
  "won't do": "cancelled",
};

const JIRA_PRIORITY_MAP: Record<string, WorkItemPriority> = {
  highest: "urgent",
  high: "high",
  medium: "medium",
  low: "low",
  lowest: "low",
};

// Forma mínima que necesitamos del payload de Jira (REST API v3, GET /search)
export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string | null;
    status: { name: string };
    priority?: { name: string } | null;
    duedate?: string | null; // "YYYY-MM-DD"
    created: string;
    updated: string;
    resolutiondate?: string | null;
    assignee?: { displayName: string } | null;
    labels?: string[];
    timeestimate?: number | null; // segundos
    project?: { name: string } | null;
  };
}

export function fromJiraIssue(issue: JiraIssue, userId: string, internalId: string): WorkItem {
  return {
    id: internalId,
    userId,
    source: "jira",
    kind: kindForSource("jira"),
    externalId: issue.key,
    title: issue.fields.summary,
    description: issue.fields.description ?? null,
    status: JIRA_STATUS_MAP[issue.fields.status.name.trim().toLowerCase()] ?? "open",
    priority: issue.fields.priority?.name
      ? JIRA_PRIORITY_MAP[issue.fields.priority.name.trim().toLowerCase()] ?? "none"
      : "none",
    dueAt: issue.fields.duedate ?? null,
    estimatedMinutes: issue.fields.timeestimate ? Math.round(issue.fields.timeestimate / 60) : null,
    tags: issue.fields.labels ?? [],
    relatedPerson: issue.fields.assignee?.displayName ?? null,
    relatedProject: issue.fields.project?.name ?? null,
    createdAt: issue.fields.created,
    updatedAt: issue.fields.updated,
    completedAt: issue.fields.resolutiondate ?? null,
  };
}

const ZOHO_STATUS_MAP: Record<string, WorkItemStatus> = {
  open: "open",
  "on hold": "waiting_for",
  escalated: "in_progress",
  "in progress": "in_progress",
  closed: "done",
};

const ZOHO_PRIORITY_MAP: Record<string, WorkItemPriority> = {
  urgent: "urgent",
  high: "high",
  medium: "medium",
  low: "low",
};

// Forma mínima que necesitamos del payload de Zoho Desk (GET /tickets)
export interface ZohoTicket {
  id: string;
  subject: string;
  description?: string | null;
  status: string; // "Open" | "On Hold" | "Escalated" | "Closed" | ...
  priority?: string | null; // "High" | "Medium" | "Low" | "Urgent"
  dueDate?: string | null;
  createdTime: string;
  modifiedTime: string;
  closedTime?: string | null;
  contact?: { firstName?: string; lastName?: string } | null;
  productName?: string | null;
}

export function fromZohoTicket(ticket: ZohoTicket, userId: string, internalId: string): WorkItem {
  const contactName = ticket.contact
    ? [ticket.contact.firstName, ticket.contact.lastName].filter(Boolean).join(" ") || null
    : null;

  return {
    id: internalId,
    userId,
    source: "zoho_desk",
    kind: kindForSource("zoho_desk"),
    externalId: ticket.id,
    title: ticket.subject,
    description: ticket.description ?? null,
    status: ZOHO_STATUS_MAP[ticket.status.trim().toLowerCase()] ?? "open",
    priority: ticket.priority ? ZOHO_PRIORITY_MAP[ticket.priority.trim().toLowerCase()] ?? "none" : "none",
    dueAt: ticket.dueDate ?? null,
    estimatedMinutes: null, // Zoho Desk no trae estimación de tiempo
    tags: [],
    relatedPerson: contactName,
    relatedProject: ticket.productName ?? null,
    createdAt: ticket.createdTime,
    updatedAt: ticket.modifiedTime,
    completedAt: ticket.closedTime ?? null,
  };
}

// Forma mínima que necesitamos del payload de Microsoft Graph (GET /me/calendarview)
export interface GraphEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: boolean;
  location?: { displayName?: string | null } | null;
}

/**
 * Graph regresa startAt/endAt "naive" (sin offset) + un timeZone aparte.
 * Los normalizamos a ISO 8601 con offset explícito. Si tu graphClient ya manda
 * el header "Prefer: outlook.timezone=UTC", esto es un passthrough seguro.
 */
function toIsoWithOffset(dateTime: string, timeZone: string): string {
  if (timeZone.toUpperCase() === "UTC") {
    return dateTime.endsWith("Z") ? dateTime : `${dateTime}Z`;
  }
  const asUtcGuess = new Date(`${dateTime}Z`);
  const offsetMinutes = getTimeZoneOffsetMinutes(asUtcGuess, timeZone);
  const corrected = new Date(asUtcGuess.getTime() - offsetMinutes * 60_000);
  return corrected.toISOString();
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asIfUtc - date.getTime()) / 60_000;
}

export function fromOutlookEvent(event: GraphEvent, userId: string, internalId: string): CalendarEvent {
  return {
    id: internalId,
    userId,
    // "outlook" (TaskSource) es correo, aún en deferredProviders.
    // El calendario de Outlook/Microsoft cae bajo el CalendarSource "microsoft_calendar".
    source: "microsoft_calendar",
    externalId: event.id,
    title: event.subject,
    startAt: toIsoWithOffset(event.start.dateTime, event.start.timeZone),
    endAt: toIsoWithOffset(event.end.dateTime, event.end.timeZone),
    isAllDay: event.isAllDay,
    location: event.location?.displayName ?? null,
  };
}

export function withOverlays(
  items: WorkItem[],
  overlaysByWorkItemId: Map<string, WorkItemOverlay>,
): WorkItemWithOverlay[] {
  return items.map((item) => ({
    ...item,
    overlay: overlaysByWorkItemId.get(item.id) ?? null,
  }));
}
 
