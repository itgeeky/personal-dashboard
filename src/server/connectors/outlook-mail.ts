import { requireEnv } from "@/lib/env";
import type { NormalizedExternalTask, OAuthTokens } from "./types";

function tenant(): string {
  return process.env.MICROSOFT_TENANT?.trim() || "common";
}

function authBase(): string {
  return `https://login.microsoftonline.com/${tenant()}/oauth2/v2.0`;
}

const SCOPES = ["offline_access", "User.Read", "Mail.Read"].join(" ");

const MESSAGE_SELECT = "id,subject,from,bodyPreview,importance,webLink,inferenceClassification";

type GraphMessage = {
  id: string;
  subject?: string;
  bodyPreview?: string;
  importance?: string;
  webLink?: string;
  inferenceClassification?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
};

type GraphFolder = {
  id: string;
  displayName?: string;
};

export class OutlookMailConnector {
  provider = "outlook" as const;

  authorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: requireEnv("MICROSOFT_CLIENT_ID"),
      redirect_uri: redirectUri,
      response_type: "code",
      response_mode: "query",
      scope: SCOPES,
      state,
      prompt: "select_account",
    });
    return `${authBase()}/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    return this.tokenRequest({
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: SCOPES,
    });
  }

  async refresh(tokens: OAuthTokens): Promise<OAuthTokens> {
    if (!tokens.refreshToken) {
      return tokens;
    }
    const next = await this.tokenRequest({
      refresh_token: tokens.refreshToken,
      grant_type: "refresh_token",
      scope: SCOPES,
    });
    return {
      ...next,
      refreshToken: next.refreshToken ?? tokens.refreshToken,
    };
  }

  async listInboxMessages(tokens: OAuthTokens): Promise<NormalizedExternalTask[]> {
    const kivaFolderId = await this.findKivaFolderId(tokens);

    const [focused, kiva] = await Promise.all([
      this.fetchUnread(tokens, "inbox").then((messages) =>
        messages.filter((message) => message.inferenceClassification === "focused"),
      ),
      kivaFolderId ? this.fetchUnread(tokens, kivaFolderId) : Promise.resolve([]),
    ]);

    return [
      ...focused.map((message) => toTask(message, "Focused")),
      ...kiva.map((message) => toTask(message, "Kiva")),
    ];
  }

  private async findKivaFolderId(tokens: OAuthTokens): Promise<string | null> {
    try {
      const top = await this.listFolders(tokens, "/me/mailFolders?$top=100&$select=id,displayName");
      const direct = top.find((folder) => matchesKiva(folder.displayName));
      if (direct) return direct.id;

      const children = await this.listFolders(
        tokens,
        "/me/mailFolders/inbox/childFolders?$top=100&$select=id,displayName",
      );
      return children.find((folder) => matchesKiva(folder.displayName))?.id ?? null;
    } catch (error) {
      console.error("Outlook Kiva folder lookup failed:", error);
      return null;
    }
  }

  private async listFolders(tokens: OAuthTokens, path: string): Promise<GraphFolder[]> {
    const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Outlook folder list failed: ${await response.text()}`);
    }
    const payload = (await response.json()) as { value?: GraphFolder[] };
    return payload.value ?? [];
  }

  private async fetchUnread(tokens: OAuthTokens, folderId: string): Promise<GraphMessage[]> {
    const params = new URLSearchParams({
      $filter: "isRead eq false",
      $select: MESSAGE_SELECT,
      $top: "50",
    });
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/mailFolders/${folderId}/messages?${params.toString()}`,
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
    );
    if (!response.ok) {
      throw new Error(`Outlook message list failed: ${await response.text()}`);
    }
    const payload = (await response.json()) as { value?: GraphMessage[] };
    return payload.value ?? [];
  }

  private async tokenRequest(extra: Record<string, string>): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      client_id: requireEnv("MICROSOFT_CLIENT_ID"),
      client_secret: requireEnv("MICROSOFT_CLIENT_SECRET"),
      ...extra,
    });
    const response = await fetch(`${authBase()}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) {
      throw new Error(`Microsoft token request failed: ${await response.text()}`);
    }
    const payload = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!payload.access_token) {
      throw new Error("Microsoft token response missing access_token");
    }
    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? null,
      expiresAt: payload.expires_in ? Date.now() + payload.expires_in * 1000 : null,
    };
  }
}

function matchesKiva(displayName: string | undefined): boolean {
  return (displayName ?? "").trim().toLowerCase() === "kiva";
}

function toTask(message: GraphMessage, folder: "Focused" | "Kiva"): NormalizedExternalTask {
  return {
    externalId: message.id,
    title: message.subject?.trim() || "(No subject)",
    description: message.bodyPreview?.trim() || null,
    status: "open",
    priority: message.importance === "high" ? "high" : "none",
    dueAt: null,
    relatedProject: folder,
    relatedPerson: message.from?.emailAddress?.name ?? message.from?.emailAddress?.address ?? null,
    tags: [folder.toLowerCase()],
    raw: message.webLink ? { webLink: message.webLink } : undefined,
  };
}
