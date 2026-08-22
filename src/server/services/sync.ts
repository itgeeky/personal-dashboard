import type { SupabaseClient } from "@supabase/supabase-js";
import { endOfLocalDay, startOfLocalDay } from "@/domain/calendar";
import type { CalendarSource } from "@/domain/enums";
import { userTimeZone } from "@/lib/env";
import { getCalendarConnector } from "@/server/connectors/registry";
import { upsertExternalTasks } from "./tasks";
import { upsertCalendarEvents } from "./calendar";
import { getConnectionTokens, touchSyncCursor, upsertConnection } from "./connections";

const calendarProviders: CalendarSource[] = ["google_calendar", "microsoft_calendar"];

export async function syncCalendar(
  supabase: SupabaseClient,
  userId: string,
  provider: CalendarSource,
) {
  const connector = getCalendarConnector(provider);
  const stored = await getConnectionTokens(supabase, userId, provider);
  if (!stored) {
    throw new Error(`${provider} is not connected`);
  }

  let tokens = stored.tokens;
  const stale = !tokens.expiresAt || tokens.expiresAt < Date.now() + 60_000;
  if (stale) {
    tokens = await connector.refresh(tokens);
    await upsertConnection(supabase, userId, provider, tokens);
  }

  const timeZone = userTimeZone();
  const now = new Date();
  const from = startOfLocalDay(now, timeZone);
  const to = endOfLocalDay(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), timeZone);
  const range = { timeMin: from.toISOString(), timeMax: to.toISOString() };

  let events;
  try {
    events = await connector.listEvents(tokens, range);
  } catch {
    tokens = await connector.refresh(tokens);
    await upsertConnection(supabase, userId, provider, tokens);
    events = await connector.listEvents(tokens, range);
  }

  await upsertCalendarEvents(supabase, userId, provider, events);
  await touchSyncCursor(supabase, userId, provider, to.toISOString());
  return { provider, imported: events.length };
}

export async function syncConnectedCalendars(supabase: SupabaseClient, userId: string) {
  const results = (
    await Promise.all(
      calendarProviders.map(async (provider) => {
        const stored = await getConnectionTokens(supabase, userId, provider);
        if (!stored) return null;
        return syncCalendar(supabase, userId, provider);
      }),
    )
  ).filter((item): item is { provider: CalendarSource; imported: number } => item !== null);

  if (results.length === 0) {
    throw new Error("No calendar is connected");
  }
  return {
    imported: results.reduce((sum, item) => sum + item.imported, 0),
    calendars: results,
  };
}

export async function syncJira(supabase: SupabaseClient, userId: string) {
  const { JiraConnector } = await import("@/server/connectors/jira");
  const jira = new JiraConnector();
  const stored = await getConnectionTokens(supabase, userId, "jira");
  if (!stored) {
    throw new Error("Jira is not connected");
  }

  let tokens = stored.tokens;
  if (tokens.authType !== "api_token") {
    const stale = !tokens.expiresAt || tokens.expiresAt < Date.now() + 60_000;
    if (stale) {
      tokens = await jira.refresh(tokens);
      await upsertConnection(supabase, userId, "jira", tokens);
    }
  }

  let issues;
  try {
    issues = await jira.listAssignedIssues(tokens);
  } catch {
    if (tokens.authType === "api_token") throw new Error("Jira sync failed. Check the site URL and API token.");
    tokens = await jira.refresh(tokens);
    await upsertConnection(supabase, userId, "jira", tokens);
    issues = await jira.listAssignedIssues(tokens);
  }

  const imported = await upsertExternalTasks(supabase, userId, "jira", issues);
  await touchSyncCursor(supabase, userId, "jira", new Date().toISOString());
  return { imported, provider: "jira" as const };
}

export async function syncZohoDesk(supabase: SupabaseClient, userId: string) {
  const { ZohoDeskConnector } = await import("@/server/connectors/zoho-desk");
  const zoho = new ZohoDeskConnector();
  const stored = await getConnectionTokens(supabase, userId, "zoho_desk");
  if (!stored) {
    throw new Error("Zoho Desk is not connected");
  }

  let tokens = stored.tokens;
  const stale = !tokens.expiresAt || tokens.expiresAt < Date.now() + 60_000;
  if (stale) {
    tokens = await zoho.refresh(tokens);
  }
  tokens = await zoho.hydrate(tokens);
  await upsertConnection(supabase, userId, "zoho_desk", tokens);

  let tickets;
  try {
    tickets = await zoho.listTickets(tokens);
  } catch {
    tokens = await zoho.refresh(tokens);
    tokens = await zoho.hydrate(tokens);
    await upsertConnection(supabase, userId, "zoho_desk", tokens);
    tickets = await zoho.listTickets(tokens);
  }

  const imported = await upsertExternalTasks(supabase, userId, "zoho_desk", tickets, true);
  await touchSyncCursor(supabase, userId, "zoho_desk", new Date().toISOString());
  return { imported, provider: "zoho_desk" as const };
}

export async function syncGitHub(supabase: SupabaseClient, userId: string) {
  const { GitHubConnector } = await import("@/server/connectors/github");
  const github = new GitHubConnector();
  const stored = await getConnectionTokens(supabase, userId, "github");
  if (!stored) {
    throw new Error("GitHub is not connected");
  }

  const work = await github.listWork(stored.tokens);
  const imported = await upsertExternalTasks(supabase, userId, "github", work, true);
  await touchSyncCursor(supabase, userId, "github", new Date().toISOString());
  return { imported, provider: "github" as const };
}
