import { requireEnv } from "@/lib/env";
import type { WorkItemPriority, WorkItemStatus } from "@/domain/enums";
import type { NormalizedExternalTask, OAuthTokens } from "./types";

function accountsUrl(): string {
  return (process.env.ZOHO_ACCOUNTS_URL ?? "https://accounts.zoho.com").replace(/\/$/, "");
}

function deskUrl(): string {
  return (process.env.ZOHO_DESK_URL ?? "https://desk.zoho.com").replace(/\/$/, "");
}

function scopes(): string {
  return (
    process.env.ZOHO_SCOPE ??
    "Desk.tickets.READ,Desk.contacts.READ,Desk.settings.READ,Desk.basic.READ"
  );
}

export class ZohoDeskConnector {
  provider = "zoho_desk" as const;

  authorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: requireEnv("ZOHO_CLIENT_ID"),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes(),
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `${accountsUrl()}/oauth/v2/auth?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string, accountsHost?: string): Promise<OAuthTokens> {
    const host = (accountsHost ?? accountsUrl()).replace(/\/$/, "");
    const tokens = await this.tokenRequest(host, {
      grant_type: "authorization_code",
      client_id: requireEnv("ZOHO_CLIENT_ID"),
      client_secret: requireEnv("ZOHO_CLIENT_SECRET"),
      redirect_uri: redirectUri,
      code,
    });
    return this.withOrg({ ...tokens, accountsUrl: host, siteUrl: deskUrl() });
  }

  async refresh(tokens: OAuthTokens): Promise<OAuthTokens> {
    if (!tokens.refreshToken) return tokens;
    const host = (tokens.accountsUrl ?? accountsUrl()).replace(/\/$/, "");
    const next = await this.tokenRequest(host, {
      grant_type: "refresh_token",
      client_id: requireEnv("ZOHO_CLIENT_ID"),
      client_secret: requireEnv("ZOHO_CLIENT_SECRET"),
      refresh_token: tokens.refreshToken,
    });
    return this.withOrg({
      ...next,
      refreshToken: next.refreshToken ?? tokens.refreshToken,
      accountsUrl: host,
      siteUrl: tokens.siteUrl ?? deskUrl(),
      orgId: tokens.orgId,
    });
  }

  async listTickets(tokens: OAuthTokens): Promise<NormalizedExternalTask[]> {
    const ready = await this.hydrate(tokens);
    const orgId = ready.orgId;
    if (!orgId) throw new Error("Zoho Desk org id is missing");
    const base = (ready.siteUrl ?? deskUrl()).replace(/\/$/, "");
    const tickets: ZohoTicket[] = [];
    const limit = 100;
    const maxPages = 5;
    // Zoho Desk indexes tickets from 1; `from=0` is rejected as invalid.
    let from = 1;

    for (let page = 0; page < maxPages; page += 1) {
      const params = new URLSearchParams({
        limit: String(limit),
        from: String(from),
        sortBy: "-modifiedTime",
        include: "contacts,assignee,departments",
      });
      const assignee = process.env.ZOHO_ASSIGNEE_ID?.trim();
      if (assignee) params.set("assignee", assignee);
      const departments = process.env.ZOHO_DEPARTMENT_IDS?.trim();
      if (departments) params.set("departmentIds", departments);

      const response = await fetch(`${base}/api/v1/tickets?${params.toString()}`, {
        headers: {
          Authorization: `Zoho-oauthtoken ${ready.accessToken}`,
          orgId,
        },
      });

      // Zoho answers 204 with an empty body when nothing matches.
      if (response.status === 204) break;
      if (!response.ok) {
        throw new Error(`Zoho Desk list failed (${response.status}): ${await response.text()}`);
      }

      const body = await response.text();
      if (!body.trim()) break;
      const payload = JSON.parse(body) as { data?: ZohoTicket[] };
      const batch = payload.data ?? [];
      tickets.push(...batch);
      if (batch.length < limit) break;
      from += limit;
    }

    return tickets.filter(inScope).map(toTask);
  }

  async hydrate(tokens: OAuthTokens): Promise<OAuthTokens> {
    return this.withOrg({ ...tokens, siteUrl: tokens.siteUrl ?? deskUrl() });
  }

  /** Raw counts and status names, for diagnosing an empty sync. */
  async describe(tokens: OAuthTokens) {
    const ready = await this.hydrate(tokens);
    const base = (ready.siteUrl ?? deskUrl()).replace(/\/$/, "");
    const params = new URLSearchParams({
      limit: "100",
      from: "1",
      sortBy: "-modifiedTime",
      include: "contacts,assignee,departments",
    });
    const assignee = process.env.ZOHO_ASSIGNEE_ID?.trim();
    if (assignee) params.set("assignee", assignee);

    const response = await fetch(`${base}/api/v1/tickets?${params.toString()}`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${ready.accessToken}`,
        orgId: ready.orgId ?? "",
      },
    });
    const raw = response.status === 204 ? "" : await response.text();
    const tickets = raw.trim()
      ? ((JSON.parse(raw) as { data?: ZohoTicket[] }).data ?? [])
      : [];

    return {
      deskBaseUrl: base,
      orgId: ready.orgId,
      httpStatus: response.status,
      assigneeFilter: assignee ?? null,
      fetched: tickets.length,
      statusTypeScope: allowedStatusTypes(),
      inScope: tickets.filter(inScope).length,
      statuses: [...new Set(tickets.map((t) => `${t.status ?? "?"} (${t.statusType ?? "?"})`))],
      departments: [...new Set(tickets.map((t) => t.department?.name ?? "?"))],
      error: response.ok ? null : raw.slice(0, 500),
    };
  }

  private async withOrg(tokens: OAuthTokens): Promise<OAuthTokens> {
    if (tokens.orgId) return tokens;
    const base = (tokens.siteUrl ?? deskUrl()).replace(/\/$/, "");
    const response = await fetch(`${base}/api/v1/organizations`, {
      headers: { Authorization: `Zoho-oauthtoken ${tokens.accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Zoho Desk org lookup failed: ${await response.text()}`);
    }
    const payload = (await response.json()) as {
      data?: Array<{ id: string; isDefault?: boolean }>;
    };
    const org =
      payload.data?.find((item) => item.isDefault) ?? payload.data?.[0];
    if (!org) throw new Error("No Zoho Desk organization is accessible.");
    return { ...tokens, orgId: org.id };
  }

  private async tokenRequest(host: string, body: Record<string, string>): Promise<OAuthTokens> {
    const response = await fetch(`${host}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    });
    if (!response.ok) {
      throw new Error(`Zoho token request failed: ${await response.text()}`);
    }
    const payload = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      api_domain?: string;
      error?: string;
    };
    if (payload.error || !payload.access_token) {
      throw new Error(`Zoho token response: ${payload.error ?? "missing access_token"}`);
    }
    const apiDomain = payload.api_domain ?? "";
    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? null,
      expiresAt: payload.expires_in ? Date.now() + payload.expires_in * 1000 : null,
      authType: "oauth",
      siteUrl: deskUrlFromApiDomain(apiDomain) ?? deskUrl(),
    };
  }
}

/** api_domain looks like https://www.zohoapis.eu — reuse its regional suffix. */
function deskUrlFromApiDomain(apiDomain: string): string | null {
  if (!apiDomain) return null;
  const match = /zohoapis?\.([a-z.]+)$/.exec(new URL(apiDomain).host);
  return match ? `https://desk.zoho.${match[1]}` : null;
}

type ZohoTicket = {
  id: string;
  ticketNumber?: string | number;
  subject?: string;
  status?: string;
  statusType?: string;
  priority?: string;
  dueDate?: string | null;
  createdTime?: string;
  modifiedTime?: string;
  customerResponseTime?: string | null;
  isOverDue?: boolean;
  assigneeId?: string | null;
  contact?: { firstName?: string; lastName?: string; email?: string };
  assignee?: { firstName?: string; lastName?: string; email?: string };
  department?: { name?: string };
  lastThread?: { direction?: string; createdTime?: string };
};

function toTask(ticket: ZohoTicket): NormalizedExternalTask {
  const number = ticket.ticketNumber != null ? String(ticket.ticketNumber) : ticket.id;
  const contact = displayName(ticket.contact);
  const assignee = displayName(ticket.assignee);
  const needsReply = unanswered(ticket);
  const lines = [
    assignee ? `Assignee: ${assignee}` : "Unassigned",
    contact ? `Contact: ${contact}` : null,
    ticket.isOverDue ? "SLA overdue" : null,
    needsReply ? "Last thread looks like a customer message — reply may be due." : null,
    ticket.customerResponseTime ? `Last customer activity: ${ticket.customerResponseTime}` : null,
  ].filter(Boolean);

  return {
    externalId: ticket.id,
    title: `#${number} — ${ticket.subject?.trim() || "(No subject)"}`,
    description: lines.join("\n"),
    status: mapStatus(ticket),
    priority: mapPriority(ticket.priority, ticket.isOverDue, needsReply),
    dueAt: ticket.dueDate ?? null,
    relatedPerson: assignee ?? contact ?? null,
    relatedProject: ticket.department?.name ?? "Zoho Desk",
    tags: [
      ticket.status,
      ticket.priority,
      needsReply ? "needs_reply" : null,
      ticket.isOverDue ? "sla_overdue" : null,
    ].filter(Boolean) as string[],
  };
}

/**
 * Zoho groups every custom status name under a statusType: Open, On Hold or Closed.
 * Default scope is Open only; set ZOHO_STATUS_TYPES to widen it (e.g. "Open,On Hold" or "all").
 */
function allowedStatusTypes(): string[] {
  const raw = process.env.ZOHO_STATUS_TYPES?.trim();
  if (!raw) return ["open"];
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function inScope(ticket: ZohoTicket): boolean {
  const allowed = allowedStatusTypes();
  if (allowed.includes("all")) return true;
  const type = (ticket.statusType ?? "").toLowerCase();
  if (type) return allowed.includes(type);
  const status = (ticket.status ?? "").toLowerCase();
  return allowed.some((value) => status.includes(value));
}

function unanswered(ticket: ZohoTicket): boolean {
  const direction = ticket.lastThread?.direction?.toLowerCase();
  if (direction === "in" || direction === "incoming") return true;
  if (!ticket.customerResponseTime || !ticket.modifiedTime) return false;
  return new Date(ticket.customerResponseTime).getTime() >= new Date(ticket.modifiedTime).getTime() - 2000;
}

function mapStatus(ticket: ZohoTicket): WorkItemStatus {
  const name = `${ticket.status ?? ""} ${ticket.statusType ?? ""}`.toLowerCase();
  if (name.includes("close") || name.includes("resolv") || name.includes("spam")) return "done";
  if (name.includes("hold") || name.includes("wait") || name.includes("pending")) return "waiting_for";
  if (ticket.assigneeId || ticket.assignee) return "in_progress";
  return "open";
}

function mapPriority(
  name: string | undefined,
  overdue: boolean | undefined,
  needsReply: boolean,
): WorkItemPriority {
  if (overdue) return "urgent";
  const value = (name ?? "").toLowerCase();
  if (value.includes("highest") || value.includes("urgent") || value.includes("blocker")) return "urgent";
  if (value.includes("high")) return "high";
  if (needsReply) return "high";
  if (value.includes("medium") || value.includes("normal")) return "medium";
  if (value.includes("low")) return "low";
  return "none";
}

function displayName(person?: { firstName?: string; lastName?: string; email?: string } | null): string | null {
  if (!person) return null;
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return name || person.email || null;
}

export { zohoOAuthConfigured } from "./oauth-flags";
