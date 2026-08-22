import { requireEnv } from "@/lib/env";
import type { WorkItemPriority, WorkItemStatus } from "@/domain/enums";
import type { NormalizedExternalTask, OAuthTokens } from "./types";

const SCOPES = "read:jira-work read:jira-user offline_access";

export class JiraConnector {
  provider = "jira" as const;

  authorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      audience: "api.atlassian.com",
      client_id: requireEnv("JIRA_CLIENT_ID"),
      scope: SCOPES,
      redirect_uri: redirectUri,
      state,
      response_type: "code",
      prompt: "consent",
    });
    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const tokens = await this.tokenRequest({
      grant_type: "authorization_code",
      client_id: requireEnv("JIRA_CLIENT_ID"),
      client_secret: requireEnv("JIRA_CLIENT_SECRET"),
      code,
      redirect_uri: redirectUri,
    });
    return this.withCloudSite(tokens);
  }

  async refresh(tokens: OAuthTokens): Promise<OAuthTokens> {
    if (tokens.authType === "api_token" || !tokens.refreshToken) {
      return tokens;
    }
    const next = await this.tokenRequest({
      grant_type: "refresh_token",
      client_id: requireEnv("JIRA_CLIENT_ID"),
      client_secret: requireEnv("JIRA_CLIENT_SECRET"),
      refresh_token: tokens.refreshToken,
    });
    return this.withCloudSite({
      ...next,
      refreshToken: next.refreshToken ?? tokens.refreshToken,
      cloudId: tokens.cloudId,
      siteUrl: tokens.siteUrl,
    });
  }

  async verifyApiToken(siteUrl: string, email: string, apiToken: string): Promise<OAuthTokens> {
    const site = normalizeSite(siteUrl);
    const response = await fetch(`${site}/rest/api/3/myself`, {
      headers: basicHeaders(email, apiToken),
    });
    if (!response.ok) {
      throw new Error(`Jira API token check failed: ${await response.text()}`);
    }
    return {
      accessToken: apiToken,
      refreshToken: null,
      expiresAt: null,
      authType: "api_token",
      cloudId: null,
      siteUrl: site,
      email,
    };
  }

  async listAssignedIssues(tokens: OAuthTokens): Promise<NormalizedExternalTask[]> {
    const jql =
      "assignee = currentUser() AND (resolution = EMPTY OR updated >= -14d) ORDER BY updated DESC";
    const payload = await this.search(tokens, jql);
    return (payload.issues ?? []).map(toTask);
  }

  private async withCloudSite(tokens: OAuthTokens): Promise<OAuthTokens> {
    if (tokens.cloudId && tokens.siteUrl) return { ...tokens, authType: "oauth" };
    const response = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Jira site lookup failed: ${await response.text()}`);
    }
    const sites = (await response.json()) as Array<{ id: string; url: string }>;
    const preferred = process.env.JIRA_CLOUD_ID
      ? sites.find((site) => site.id === process.env.JIRA_CLOUD_ID)
      : sites[0];
    if (!preferred) {
      throw new Error("No Jira Cloud site is accessible for this account.");
    }
    return {
      ...tokens,
      authType: "oauth",
      cloudId: preferred.id,
      siteUrl: preferred.url,
    };
  }

  private async tokenRequest(body: Record<string, string>): Promise<OAuthTokens> {
    const response = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Jira token request failed: ${await response.text()}`);
    }
    const payload = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!payload.access_token) {
      throw new Error("Jira token response missing access_token");
    }
    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? null,
      expiresAt: payload.expires_in ? Date.now() + payload.expires_in * 1000 : null,
      authType: "oauth",
    };
  }

  private async search(tokens: OAuthTokens, jql: string): Promise<{ issues?: JiraIssue[] }> {
    const fields = [
      "summary",
      "status",
      "priority",
      "duedate",
      "updated",
      "project",
      "issuetype",
      "description",
      "comment",
    ];
    const post = await fetch(`${this.apiBase(tokens)}/rest/api/3/search/jql`, {
      method: "POST",
      headers: {
        ...this.authHeaders(tokens),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jql, maxResults: 100, fields }),
    });
    if (post.ok) {
      return (await post.json()) as { issues?: JiraIssue[] };
    }
    const params = new URLSearchParams({
      jql,
      maxResults: "100",
      fields: fields.join(","),
    });
    const get = await fetch(`${this.apiBase(tokens)}/rest/api/3/search?${params.toString()}`, {
      headers: this.authHeaders(tokens),
    });
    if (!get.ok) {
      throw new Error(`Jira search failed: ${await get.text()}`);
    }
    return (await get.json()) as { issues?: JiraIssue[] };
  }

  private apiBase(tokens: OAuthTokens): string {
    if (tokens.authType === "api_token") {
      if (!tokens.siteUrl) throw new Error("Jira site URL is missing");
      return tokens.siteUrl.replace(/\/$/, "");
    }
    if (!tokens.cloudId) throw new Error("Jira cloud ID is missing");
    return `https://api.atlassian.com/ex/jira/${tokens.cloudId}`;
  }

  private authHeaders(tokens: OAuthTokens): Record<string, string> {
    if (tokens.authType === "api_token") {
      if (!tokens.email) throw new Error("Jira email is missing");
      return basicHeaders(tokens.email, tokens.accessToken);
    }
    return { Authorization: `Bearer ${tokens.accessToken}`, Accept: "application/json" };
  }
}

function basicHeaders(email: string, apiToken: string): Record<string, string> {
  const basic = Buffer.from(`${email}:${apiToken}`).toString("base64");
  return { Authorization: `Basic ${basic}`, Accept: "application/json" };
}

function normalizeSite(siteUrl: string): string {
  const url = new URL(siteUrl.includes("://") ? siteUrl : `https://${siteUrl}`);
  return `${url.protocol}//${url.host}`;
}

type JiraIssue = {
  key: string;
  fields?: {
    summary?: string;
    duedate?: string | null;
    description?: unknown;
    issuetype?: { name?: string };
    project?: { key?: string; name?: string };
    status?: { name?: string; statusCategory?: { key?: string } };
    priority?: { name?: string };
    comment?: { comments?: Array<{ body?: unknown }> };
  };
};

function toTask(issue: JiraIssue): NormalizedExternalTask {
  const fields = issue.fields ?? {};
  const lastComment = fields.comment?.comments?.at(-1)?.body;
  const description = [adfToText(fields.description), lastComment ? `Latest comment: ${adfToText(lastComment)}` : ""]
    .filter(Boolean)
    .join("\n\n");
  return {
    externalId: issue.key,
    title: `${issue.key} — ${fields.summary ?? "(No summary)"}`,
    description: description || null,
    status: mapStatus(fields.status),
    priority: mapPriority(fields.priority?.name),
    dueAt: fields.duedate ? `${fields.duedate}T12:00:00.000Z` : null,
    relatedProject: fields.project?.key ?? fields.project?.name ?? null,
    tags: [fields.issuetype?.name].filter(Boolean) as string[],
  };
}

function mapStatus(status?: { name?: string; statusCategory?: { key?: string } }): WorkItemStatus {
  const name = (status?.name ?? "").toLowerCase();
  const category = status?.statusCategory?.key ?? "";
  if (name.includes("cancel") || name.includes("won't") || name.includes("wont")) return "cancelled";
  if (category === "done") return "done";
  if (name.includes("wait") || name.includes("block") || name.includes("hold")) return "waiting_for";
  if (category === "indeterminate" || name.includes("progress") || name.includes("review")) {
    return "in_progress";
  }
  return "open";
}

function mapPriority(name: string | undefined): WorkItemPriority {
  const value = (name ?? "").toLowerCase();
  if (value.includes("highest") || value.includes("blocker") || value.includes("critical")) return "urgent";
  if (value.includes("high")) return "high";
  if (value.includes("medium") || value.includes("normal")) return "medium";
  if (value.includes("low")) return "low";
  return "none";
}

function adfToText(node: unknown): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node !== "object") return "";
  const value = node as { text?: string; content?: unknown[] };
  if (value.text) return value.text;
  return (value.content ?? []).map(adfToText).join(" ").replace(/\s+/g, " ").trim();
}

export { jiraOAuthConfigured } from "./oauth-flags";
