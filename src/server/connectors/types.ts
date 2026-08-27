import type {
  ConnectorProvider,
  WorkItemPriority,
  WorkItemStatus,
} from "@/domain/enums";

export type OAuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  authType?: "oauth" | "api_token";
  cloudId?: string | null;
  siteUrl?: string | null;
  email?: string | null;
  orgId?: string | null;
  accountsUrl?: string | null;
};

export type NormalizedCalendarEvent = {
  externalId: string;
  title: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  location: string | null;
  raw?: unknown;
};

export type CalendarSyncRange = {
  timeMin: string;
  timeMax: string;
};

export type CalendarConnector = {
  provider: ConnectorProvider;
  authorizationUrl(redirectUri: string, state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens>;
  refresh(tokens: OAuthTokens): Promise<OAuthTokens>;
  listEvents(tokens: OAuthTokens, range: CalendarSyncRange): Promise<NormalizedCalendarEvent[]>;
};

export type NormalizedExternalTask = {
  externalId: string;
  title: string;
  description: string | null;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  dueAt: string | null;
  relatedProject: string | null;
  relatedPerson?: string | null;
  tags: string[];
  raw?: unknown;
};
