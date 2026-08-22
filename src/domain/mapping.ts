import type { ConnectorProvider, TaskSource, WorkItemKind } from "./enums";

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

export const deferredProviders: ConnectorProvider[] = [
  "outlook",
  "gitlab",
];

export function isImplementedProvider(provider: ConnectorProvider): boolean {
  return implementedProviders.includes(provider);
}
