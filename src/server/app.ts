import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { deferredProviders } from "@/domain/mapping";
import { workItemPriorities, workItemStatuses } from "@/domain/enums";
import { appUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  githubOAuthConfigured,
  jiraOAuthConfigured,
  zohoOAuthConfigured,
} from "@/server/connectors/oauth-flags";
import {
  deleteConnection,
  getConnectionTokens,
  listConnections,
  upsertConnection,
} from "@/server/services/connections";
import { buildDashboard } from "@/server/services/dashboard";
import {
  createManualTask,
  deleteManualTask,
  listWorkItems,
  updateTask,
} from "@/server/services/tasks";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

type Env = {
  Variables: {
    user: User;
    supabase: SupabaseClient;
  };
};

const taskInput = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  priority: z.enum(workItemPriorities).optional(),
  status: z.enum(workItemStatuses).optional(),
  dueAt: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  tags: z.array(z.string()).optional(),
  relatedPerson: z.string().nullable().optional(),
  relatedProject: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  reminderAt: z.string().nullable().optional(),
  waitingForPerson: z.string().nullable().optional(),
  waitingForExpected: z.string().nullable().optional(),
  nextAction: z.string().nullable().optional(),
});

const app = new Hono<Env>().basePath("/api");

async function googleCalendar() {
  const { GoogleCalendarConnector } = await import("@/server/connectors/google-calendar");
  return new GoogleCalendarConnector();
}

async function microsoftCalendar() {
  const { MicrosoftCalendarConnector } = await import("@/server/connectors/microsoft-calendar");
  return new MicrosoftCalendarConnector();
}

async function jiraConnector() {
  const { JiraConnector } = await import("@/server/connectors/jira");
  return new JiraConnector();
}

async function zohoDesk() {
  const { ZohoDeskConnector } = await import("@/server/connectors/zoho-desk");
  return new ZohoDeskConnector();
}

async function githubConnector() {
  const { GitHubConnector } = await import("@/server/connectors/github");
  return new GitHubConnector();
}

app.get("/health", async (c) => {
  const { deferredSliceNotes } = await import("@/server/connectors/deferred");
  return c.json({ ok: true, deferredProviders, deferred: deferredSliceNotes });
});

app.get("/integrations/microsoft/callback", async (c) => {
  const url = new URL(c.req.url);
  const azureError = url.searchParams.get("error");
  const azureDescription = url.searchParams.get("error_description") ?? "";
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = getCookie(c, "oauth_microsoft_state");
  const cookieUser = getCookie(c, "oauth_microsoft_user");
  deleteCookie(c, "oauth_microsoft_state", { path: "/" });
  deleteCookie(c, "oauth_microsoft_user", { path: "/" });

  if (azureError) {
    if (azureDescription.includes("AADSTS50194") || azureDescription.includes("/common endpoint")) {
      return c.redirect(`${appUrl()}/settings?error=microsoft_tenant`);
    }
    return c.redirect(`${appUrl()}/settings?error=microsoft`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? cookieUser;

  if (!code || !state || !expected || state !== expected || !userId) {
    return c.redirect(`${appUrl()}/settings?error=oauth`);
  }

  const microsoft = await microsoftCalendar();
  const redirectUri = `${appUrl()}/api/integrations/microsoft/callback`;
  try {
    const tokens = await microsoft.exchangeCode(code, redirectUri);
    await upsertConnection(supabase, userId, "microsoft_calendar", tokens);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Microsoft OAuth callback failed:", message);
    if (message.includes("AADSTS7000215") || message.includes("Invalid client secret")) {
      return c.redirect(`${appUrl()}/settings?error=microsoft_secret`);
    }
    return c.redirect(`${appUrl()}/settings?error=microsoft`);
  }
  return c.redirect(`${appUrl()}/settings?connected=microsoft_calendar`);
});

app.get("/integrations/google/callback", async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = getCookie(c, "oauth_google_state");
  const cookieUser = getCookie(c, "oauth_google_user");
  deleteCookie(c, "oauth_google_state", { path: "/" });
  deleteCookie(c, "oauth_google_user", { path: "/" });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? cookieUser;

  if (!code || !state || !expected || state !== expected || !userId) {
    return c.redirect(`${appUrl()}/settings?error=oauth`);
  }

  const google = await googleCalendar();
  const redirectUri = `${appUrl()}/api/integrations/google/callback`;
  try {
    const tokens = await google.exchangeCode(code, redirectUri);
    await upsertConnection(supabase, userId, "google_calendar", tokens);
  } catch {
    return c.redirect(`${appUrl()}/settings?error=google`);
  }
  return c.redirect(`${appUrl()}/settings?connected=google_calendar`);
});

app.get("/integrations/jira/callback", async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = getCookie(c, "oauth_jira_state");
  const cookieUser = getCookie(c, "oauth_jira_user");
  deleteCookie(c, "oauth_jira_state", { path: "/" });
  deleteCookie(c, "oauth_jira_user", { path: "/" });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? cookieUser;

  if (!code || !state || !expected || state !== expected || !userId) {
    return c.redirect(`${appUrl()}/settings?error=jira`);
  }

  const jira = await jiraConnector();
  const redirectUri = `${appUrl()}/api/integrations/jira/callback`;
  try {
    const tokens = await jira.exchangeCode(code, redirectUri);
    await upsertConnection(supabase, userId, "jira", tokens);
  } catch {
    return c.redirect(`${appUrl()}/settings?error=jira`);
  }
  return c.redirect(`${appUrl()}/settings?connected=jira`);
});

app.get("/integrations/zoho/callback", async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const accountsHost = url.searchParams.get("accounts-server") ?? undefined;
  const expected = getCookie(c, "oauth_zoho_state");
  const cookieUser = getCookie(c, "oauth_zoho_user");
  deleteCookie(c, "oauth_zoho_state", { path: "/" });
  deleteCookie(c, "oauth_zoho_user", { path: "/" });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? cookieUser;

  if (!code || !state || !expected || state !== expected || !userId) {
    return c.redirect(`${appUrl()}/settings?error=zoho`);
  }

  const zoho = await zohoDesk();
  const redirectUri = `${appUrl()}/api/integrations/zoho/callback`;
  try {
    const tokens = await zoho.exchangeCode(code, redirectUri, accountsHost);
    await upsertConnection(supabase, userId, "zoho_desk", tokens);
  } catch {
    return c.redirect(`${appUrl()}/settings?error=zoho`);
  }
  return c.redirect(`${appUrl()}/settings?connected=zoho_desk`);
});

app.get("/integrations/github/callback", async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = getCookie(c, "oauth_github_state");
  const cookieUser = getCookie(c, "oauth_github_user");
  deleteCookie(c, "oauth_github_state", { path: "/" });
  deleteCookie(c, "oauth_github_user", { path: "/" });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? cookieUser;

  if (!code || !state || !expected || state !== expected || !userId) {
    return c.redirect(`${appUrl()}/settings?error=github`);
  }

  const github = await githubConnector();
  const redirectUri = `${appUrl()}/api/integrations/github/callback`;
  try {
    const tokens = await github.exchangeCode(code, redirectUri);
    await upsertConnection(supabase, userId, "github", tokens);
  } catch {
    return c.redirect(`${appUrl()}/settings?error=github`);
  }
  return c.redirect(`${appUrl()}/settings?connected=github`);
});

app.use("*", async (c, next) => {
  if (
    c.req.path === "/api/health" ||
    c.req.path === "/api/integrations/google/callback" ||
    c.req.path === "/api/integrations/microsoft/callback" ||
    c.req.path === "/api/integrations/jira/callback" ||
    c.req.path === "/api/integrations/zoho/callback" ||
    c.req.path === "/api/integrations/github/callback"
  ) {
    return next();
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  c.set("user", user);
  c.set("supabase", supabase);
  await next();
});

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  return c.json({ error: message }, 500);
});

app.get("/me", (c) => {
  const user = c.get("user");
  return c.json({ id: user.id, email: user.email });
});

app.get("/dashboard", async (c) => {
  const snapshot = await buildDashboard(c.get("supabase"), c.get("user").id);
  return c.json(snapshot);
});

app.get("/tasks", async (c) => {
  const items = await listWorkItems(c.get("supabase"), c.get("user").id);
  return c.json({ items });
});

app.post("/tasks", async (c) => {
  const parsed = taskInput.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const item = await createManualTask(c.get("supabase"), c.get("user").id, parsed.data);
  return c.json({ item }, 201);
});

app.patch("/tasks/:id", async (c) => {
  const parsed = taskInput.partial().safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const item = await updateTask(
    c.get("supabase"),
    c.get("user").id,
    c.req.param("id"),
    parsed.data,
  );
  if (!item) return c.json({ error: "Not found" }, 404);
  return c.json({ item });
});

app.delete("/tasks/:id", async (c) => {
  await deleteManualTask(c.get("supabase"), c.get("user").id, c.req.param("id"));
  return c.json({ ok: true });
});

app.get("/connections", async (c) => {
  const connections = await listConnections(c.get("supabase"), c.get("user").id);
  return c.json({
    connections,
    deferredProviders,
    jiraOAuthConfigured: jiraOAuthConfigured(),
    zohoOAuthConfigured: zohoOAuthConfigured(),
    githubOAuthConfigured: githubOAuthConfigured(),
  });
});

app.get("/integrations/google/start", async (c) => {
  const state = crypto.randomUUID();
  const redirectUri = `${appUrl()}/api/integrations/google/callback`;
  setCookie(c, "oauth_google_state", state, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  setCookie(c, "oauth_google_user", c.get("user").id, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  const google = await googleCalendar();
  return c.redirect(google.authorizationUrl(redirectUri, state));
});

app.get("/integrations/microsoft/start", async (c) => {
  const state = crypto.randomUUID();
  const redirectUri = `${appUrl()}/api/integrations/microsoft/callback`;
  setCookie(c, "oauth_microsoft_state", state, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  setCookie(c, "oauth_microsoft_user", c.get("user").id, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  const microsoft = await microsoftCalendar();
  return c.redirect(microsoft.authorizationUrl(redirectUri, state));
});

app.post("/calendar/sync", async (c) => {
  const { syncConnectedCalendars } = await import("@/server/services/sync");
  const result = await syncConnectedCalendars(c.get("supabase"), c.get("user").id);
  return c.json(result);
});

app.delete("/connections/google_calendar", async (c) => {
  await deleteConnection(c.get("supabase"), c.get("user").id, "google_calendar");
  return c.json({ ok: true });
});

app.delete("/connections/microsoft_calendar", async (c) => {
  await deleteConnection(c.get("supabase"), c.get("user").id, "microsoft_calendar");
  return c.json({ ok: true });
});

app.get("/integrations/jira/start", async (c) => {
  if (!jiraOAuthConfigured()) {
    return c.json({ error: "JIRA_CLIENT_ID and JIRA_CLIENT_SECRET are not set" }, 400);
  }
  const state = crypto.randomUUID();
  const redirectUri = `${appUrl()}/api/integrations/jira/callback`;
  setCookie(c, "oauth_jira_state", state, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  setCookie(c, "oauth_jira_user", c.get("user").id, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  const jira = await jiraConnector();
  return c.redirect(jira.authorizationUrl(redirectUri, state));
});

app.post("/integrations/jira/token", async (c) => {
  const parsed = z
    .object({
      siteUrl: z.string().min(3),
      email: z.string().email(),
      apiToken: z.string().min(8),
    })
    .safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const jira = await jiraConnector();
  const tokens = await jira.verifyApiToken(
    parsed.data.siteUrl,
    parsed.data.email,
    parsed.data.apiToken,
  );
  await upsertConnection(c.get("supabase"), c.get("user").id, "jira", tokens);
  const { syncJira } = await import("@/server/services/sync");
  const result = await syncJira(c.get("supabase"), c.get("user").id);
  return c.json(result, 201);
});

app.post("/jira/sync", async (c) => {
  const { syncJira } = await import("@/server/services/sync");
  const result = await syncJira(c.get("supabase"), c.get("user").id);
  return c.json(result);
});

app.delete("/connections/jira", async (c) => {
  await deleteConnection(c.get("supabase"), c.get("user").id, "jira");
  return c.json({ ok: true });
});

app.get("/integrations/zoho/start", async (c) => {
  if (!zohoOAuthConfigured()) {
    return c.json({ error: "ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET are not set" }, 400);
  }
  const state = crypto.randomUUID();
  const redirectUri = `${appUrl()}/api/integrations/zoho/callback`;
  setCookie(c, "oauth_zoho_state", state, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  setCookie(c, "oauth_zoho_user", c.get("user").id, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  const zoho = await zohoDesk();
  return c.redirect(zoho.authorizationUrl(redirectUri, state));
});

app.post("/zoho/sync", async (c) => {
  const { syncZohoDesk } = await import("@/server/services/sync");
  const result = await syncZohoDesk(c.get("supabase"), c.get("user").id);
  return c.json(result);
});

app.get("/zoho/debug", async (c) => {
  const stored = await getConnectionTokens(c.get("supabase"), c.get("user").id, "zoho_desk");
  if (!stored) return c.json({ error: "Zoho Desk is not connected" }, 400);
  const zoho = await zohoDesk();
  return c.json(await zoho.describe(stored.tokens));
});

app.delete("/connections/zoho_desk", async (c) => {
  await deleteConnection(c.get("supabase"), c.get("user").id, "zoho_desk");
  return c.json({ ok: true });
});

app.get("/integrations/github/start", async (c) => {
  if (!githubOAuthConfigured()) {
    return c.json({ error: "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are not set" }, 400);
  }
  const state = crypto.randomUUID();
  const redirectUri = `${appUrl()}/api/integrations/github/callback`;
  setCookie(c, "oauth_github_state", state, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  setCookie(c, "oauth_github_user", c.get("user").id, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  const github = await githubConnector();
  return c.redirect(github.authorizationUrl(redirectUri, state));
});

app.post("/integrations/github/token", async (c) => {
  const parsed = z
    .object({ token: z.string().min(20) })
    .safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const github = await githubConnector();
  const tokens = await github.verifyToken(parsed.data.token);
  await upsertConnection(c.get("supabase"), c.get("user").id, "github", tokens);
  const { syncGitHub } = await import("@/server/services/sync");
  const result = await syncGitHub(c.get("supabase"), c.get("user").id);
  return c.json(result, 201);
});

app.post("/github/sync", async (c) => {
  const { syncGitHub } = await import("@/server/services/sync");
  const result = await syncGitHub(c.get("supabase"), c.get("user").id);
  return c.json(result);
});

app.get("/github/debug", async (c) => {
  const stored = await getConnectionTokens(c.get("supabase"), c.get("user").id, "github");
  if (!stored) return c.json({ error: "GitHub is not connected" }, 400);
  const github = await githubConnector();
  return c.json(await github.describe(stored.tokens));
});

app.delete("/connections/github", async (c) => {
  await deleteConnection(c.get("supabase"), c.get("user").id, "github");
  return c.json({ ok: true });
});

export { app };
