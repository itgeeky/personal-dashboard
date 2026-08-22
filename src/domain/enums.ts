/** Closed vocabularies independent of Jira, Zoho, Google, or Microsoft. */

export const workItemKinds = ["task", "inbox", "event"] as const;
export type WorkItemKind = (typeof workItemKinds)[number];

/**
 * `event` is stored in `calendar_events`, not `work_items`.
 * Inbox is untriaged; tasks are committed work.
 */
export const taskSources = [
  "manual",
  "jira",
  "zoho_desk",
  "outlook",
  "github",
  "gitlab",
] as const;
export type TaskSource = (typeof taskSources)[number];

export const calendarSources = ["google_calendar", "microsoft_calendar"] as const;
export type CalendarSource = (typeof calendarSources)[number];

export const connectorProviders = [
  "google_calendar",
  "microsoft_calendar",
  "jira",
  "zoho_desk",
  "outlook",
  "github",
  "gitlab",
] as const;
export type ConnectorProvider = (typeof connectorProviders)[number];

export const workItemStatuses = [
  "open",
  "in_progress",
  "waiting_for",
  "done",
  "cancelled",
] as const;
export type WorkItemStatus = (typeof workItemStatuses)[number];

export const workItemPriorities = ["none", "low", "medium", "high", "urgent"] as const;
export type WorkItemPriority = (typeof workItemPriorities)[number];

export const inboxActions = [
  "convert_to_task",
  "waiting_for",
  "ignore",
  "resolve",
  "snooze",
  "remind",
  "link_existing",
] as const;
export type InboxAction = (typeof inboxActions)[number];
