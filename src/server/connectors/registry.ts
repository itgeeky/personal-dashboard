import type { ConnectorProvider } from "@/domain/enums";
import { GoogleCalendarConnector } from "./google-calendar";
import { MicrosoftCalendarConnector } from "./microsoft-calendar";
import type { CalendarConnector } from "./types";

export class ConnectorNotImplementedError extends Error {
  constructor(public readonly provider: ConnectorProvider) {
    super(`${provider} is not implemented yet.`);
    this.name = "ConnectorNotImplementedError";
  }
}

const calendarConnectors: Partial<Record<ConnectorProvider, CalendarConnector>> = {
  google_calendar: new GoogleCalendarConnector(),
  microsoft_calendar: new MicrosoftCalendarConnector(),
};

export function getCalendarConnector(provider: ConnectorProvider): CalendarConnector {
  const connector = calendarConnectors[provider];
  if (!connector) {
    throw new ConnectorNotImplementedError(provider);
  }
  return connector;
}
