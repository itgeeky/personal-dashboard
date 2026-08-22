import type { WorkItemPriority, WorkItemStatus } from "@/domain/enums";
import { requireEnv } from "@/lib/env";
import type { NormalizedExternalTask, OAuthTokens } from "./types";

const API_URL = "https://api.github.com";
const OAUTH_URL = "https://github.com/login/oauth";
const API_VERSION = "2022-11-28";

type GitHubUser = {
  login: string;
};

type GitHubSearchItem = {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  repository_url: string;
  labels?: Array<{ name?: string }>;
  assignees?: GitHubUser[];
  pull_request?: unknown;
};

type GitHubWorkItem = GitHubSearchItem & {
  roles: Set<"assigned" | "authored" | "review-requested">;
};

export class GitHubConnector {
  provider = "github" as const;

  authorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: requireEnv("GITHUB_CLIENT_ID"),
      redirect_uri: redirectUri,
      scope: process.env.GITHUB_SCOPE?.trim() || "read:user",
      state,
      allow_signup: "false",
    });
    return `${OAUTH_URL}/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch(`${OAUTH_URL}/access_token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: requireEnv("GITHUB_CLIENT_ID"),
        client_secret: requireEnv("GITHUB_CLIENT_SECRET"),
        code,
        redirect_uri: redirectUri,
      }),
    });
    const payload = (await response.json()) as {
      access_token?: string;
      error_description?: string;
    };
    if (!response.ok || !payload.access_token) {
      throw new Error(payload.error_description || "GitHub OAuth token exchange failed.");
    }
    return this.verifyToken(payload.access_token, "oauth");
  }

  async verifyToken(
    accessToken: string,
    authType: "oauth" | "api_token" = "api_token",
  ): Promise<OAuthTokens> {
    const user = await this.request<GitHubUser>(accessToken, "/user");
    return {
      accessToken,
      refreshToken: null,
      expiresAt: null,
      authType,
      email: user.login,
    };
  }

  async listWork(tokens: OAuthTokens): Promise<NormalizedExternalTask[]> {
    const queries = [
      { query: "is:open assignee:@me", role: "assigned" as const },
      { query: "is:open is:pr author:@me", role: "authored" as const },
      { query: "is:open is:pr review-requested:@me", role: "review-requested" as const },
    ];
    const results = await Promise.all(
      queries.map(async ({ query, role }) => {
        const items = await this.search(tokens.accessToken, query);
        return items.map((item) => ({ item, role }));
      }),
    );

    const merged = new Map<string, GitHubWorkItem>();
    for (const result of results.flat()) {
      const current = merged.get(result.item.html_url);
      if (current) {
        current.roles.add(result.role);
      } else {
        merged.set(result.item.html_url, {
          ...result.item,
          roles: new Set([result.role]),
        });
      }
    }
    return [...merged.values()].map(toTask);
  }

  /** Per-query counts and the resolved login, for diagnosing an empty sync. */
  async describe(tokens: OAuthTokens) {
    const user = await this.request<GitHubUser>(tokens.accessToken, "/user");
    const queries = {
      assigned: "is:open assignee:@me",
      authored: "is:open is:pr author:@me",
      reviewRequested: "is:open is:pr review-requested:@me",
    };
    const counts: Record<string, number | string> = {};
    for (const [label, query] of Object.entries(queries)) {
      try {
        const params = new URLSearchParams({ q: query, per_page: "1" });
        const payload = await this.request<{ total_count?: number }>(
          tokens.accessToken,
          `/search/issues?${params.toString()}`,
        );
        counts[label] = payload.total_count ?? 0;
      } catch (error) {
        counts[label] = error instanceof Error ? error.message : "failed";
      }
    }
    return { login: user.login, authType: tokens.authType ?? "api_token", counts };
  }

  private async search(accessToken: string, query: string): Promise<GitHubSearchItem[]> {
    const items: GitHubSearchItem[] = [];
    const pageSize = 100;
    // GitHub Search exposes at most 1,000 results for a query.
    for (let page = 1; page <= 10; page += 1) {
      const params = new URLSearchParams({
        q: query,
        sort: "updated",
        order: "desc",
        per_page: String(pageSize),
        page: String(page),
      });
      const payload = await this.request<{ items?: GitHubSearchItem[] }>(
        accessToken,
        `/search/issues?${params.toString()}`,
      );
      const batch = payload.items ?? [];
      items.push(...batch);
      if (batch.length < pageSize) break;
    }
    return items;
  }

  private async request<T>(accessToken: string, path: string): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": API_VERSION,
        "User-Agent": "personal-work-cockpit",
      },
    });
    if (!response.ok) {
      throw new Error(`GitHub API failed (${response.status}): ${await response.text()}`);
    }
    return response.json() as Promise<T>;
  }
}

function toTask(item: GitHubWorkItem): NormalizedExternalTask {
  const repository = item.repository_url.split("/").slice(-2).join("/");
  const isPullRequest = Boolean(item.pull_request);
  const roles = [...item.roles];
  const priority: WorkItemPriority = roles.includes("review-requested") ? "high" : "none";
  const status: WorkItemStatus = "open";

  return {
    externalId: item.html_url,
    title: item.title,
    description: item.body,
    status,
    priority,
    dueAt: null,
    relatedProject: repository || null,
    relatedPerson: item.assignees?.map((assignee) => assignee.login).join(", ") || null,
    tags: [
      "github",
      isPullRequest ? "pull-request" : "issue",
      ...roles,
      ...(item.labels ?? []).flatMap((label) => (label.name ? [label.name] : [])),
    ],
  };
}
