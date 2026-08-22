import { requireEnv } from "@/lib/env";
import type {
  CalendarConnector,
  CalendarSyncRange,
  NormalizedCalendarEvent,
  OAuthTokens,
} from "./types";

function tenant(): string {
  return process.env.MICROSOFT_TENANT?.trim() || "common";
}

function authBase(): string {
  return `https://login.microsoftonline.com/${tenant()}/oauth2/v2.0`;
}

const SCOPES = ["offline_access", "User.Read", "Calendars.Read"].join(" ");

export class MicrosoftCalendarConnector implements CalendarConnector {
  provider = "microsoft_calendar" as const;

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

  async listEvents(
    tokens: OAuthTokens,
    range: CalendarSyncRange,
  ): Promise<NormalizedCalendarEvent[]> {
    const params = new URLSearchParams({
      startDateTime: range.timeMin,
      endDateTime: range.timeMax,
      $select: "id,subject,location,start,end,isAllDay,showAs,isCancelled",
      $orderby: "start/dateTime",
      $top: "100",
    });
    let nextUrl: string | null =
      `https://graph.microsoft.com/v1.0/me/calendarView?${params.toString()}`;
    const events: NormalizedCalendarEvent[] = [];

    while (nextUrl) {
      const response: Response = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          Prefer: 'outlook.timezone="UTC"',
        },
      });
      if (!response.ok) {
        throw new Error(`Outlook Calendar list failed: ${await response.text()}`);
      }
      const payload = (await response.json()) as {
        value?: Array<{
          id?: string;
          subject?: string;
          isAllDay?: boolean;
          isCancelled?: boolean;
          showAs?: string;
          location?: { displayName?: string };
          start?: { dateTime?: string; timeZone?: string };
          end?: { dateTime?: string; timeZone?: string };
        }>;
        "@odata.nextLink"?: string;
      };

      for (const item of payload.value ?? []) {
        if (!item.id || item.isCancelled || item.showAs === "free") continue;
        const allDay = Boolean(item.isAllDay);
        events.push({
          externalId: item.id,
          title: item.subject?.trim() || "(No title)",
          startAt: graphDateToIso(item.start, allDay),
          endAt: graphDateToIso(item.end, allDay),
          isAllDay: allDay,
          location: item.location?.displayName?.trim() || null,
          raw: item,
        });
      }

      nextUrl = payload["@odata.nextLink"] ?? null;
    }

    return events;
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

function graphDateToIso(
  value: { dateTime?: string; timeZone?: string } | undefined,
  allDay: boolean,
): string {
  const raw = value?.dateTime;
  if (!raw) return new Date().toISOString();
  if (allDay) {
    return new Date(`${raw.slice(0, 10)}T00:00:00.000Z`).toISOString();
  }
  const trimmed = raw.replace(/\.\d+$/, "");
  if (trimmed.endsWith("Z")) return new Date(trimmed).toISOString();
  const zone = value?.timeZone ?? "UTC";
  if (zone === "UTC" || zone === "utc") {
    return new Date(`${trimmed}Z`).toISOString();
  }
  return new Date(trimmed).toISOString();
}
