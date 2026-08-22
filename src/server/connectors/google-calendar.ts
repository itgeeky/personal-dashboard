import { requireEnv } from "@/lib/env";
import type { CalendarConnector, CalendarSyncRange, NormalizedCalendarEvent, OAuthTokens } from "./types";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export class GoogleCalendarConnector implements CalendarConnector {
  provider = "google_calendar" as const;

  authorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      code,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) {
      throw new Error(`Google token exchange failed: ${await response.text()}`);
    }
    return parseTokenResponse(await response.json());
  }

  async refresh(tokens: OAuthTokens): Promise<OAuthTokens> {
    if (!tokens.refreshToken) {
      return tokens;
    }
    const body = new URLSearchParams({
      refresh_token: tokens.refreshToken,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
    });
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) {
      throw new Error(`Google refresh failed: ${await response.text()}`);
    }
    const next = parseTokenResponse(await response.json());
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
      timeMin: range.timeMin,
      timeMax: range.timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
    );
    if (!response.ok) {
      throw new Error(`Google Calendar list failed: ${await response.text()}`);
    }
    const payload = (await response.json()) as {
      items?: Array<{
        id?: string;
        summary?: string;
        location?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }>;
    };

    return (payload.items ?? [])
      .filter((item) => item.id)
      .map((item) => {
        const allDay = Boolean(item.start?.date && !item.start?.dateTime);
        const startAt = item.start?.dateTime ?? allDayStart(item.start?.date);
        const endAt = item.end?.dateTime ?? allDayEnd(item.end?.date);
        return {
          externalId: item.id as string,
          title: item.summary ?? "(No title)",
          startAt,
          endAt,
          isAllDay: allDay,
          location: item.location ?? null,
          raw: item,
        };
      });
  }
}

function parseTokenResponse(payload: {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}): OAuthTokens {
  if (!payload.access_token) {
    throw new Error("Google token response missing access_token");
  }
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: payload.expires_in ? Date.now() + payload.expires_in * 1000 : null,
  };
}

function allDayStart(date: string | undefined): string {
  return new Date(`${date ?? "1970-01-01"}T00:00:00.000Z`).toISOString();
}

function allDayEnd(date: string | undefined): string {
  return new Date(`${date ?? "1970-01-01"}T00:00:00.000Z`).toISOString();
}
