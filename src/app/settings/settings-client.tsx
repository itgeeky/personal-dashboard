"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyHint, Panel, PanelHeader } from "@/components/panel";
import { deferredProviders, implementedProviders } from "@/domain/mapping";
import { cn } from "@/lib/utils";

type Connection = { provider: string; updated_at: string };

const fieldClass =
  "h-9 w-full rounded-full bg-muted px-3.5 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:outline-none";

const syncButtonClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex h-9 items-center rounded-full bg-muted px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none";

const connectLinkClass =
  "inline-flex h-9 w-fit items-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none";

const providerLabels: Record<string, string> = {
  google_calendar: "Google Calendar",
  microsoft_calendar: "Outlook Calendar",
  jira: "Jira",
  zoho_desk: "Zoho Desk",
  outlook: "Outlook Mail",
  github: "GitHub",
  gitlab: "GitLab",
};

export function SettingsClient({
  email: initialEmail,
  connections: initialConnections,
  jiraOAuthConfigured,
  zohoOAuthConfigured,
  githubOAuthConfigured,
}: {
  email: string | null;
  connections: Connection[];
  jiraOAuthConfigured: boolean;
  zohoOAuthConfigured: boolean;
  githubOAuthConfigured: boolean;
}) {
  const params = useSearchParams();
  const [email, setEmail] = useState<string | null>(initialEmail);
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [message, setMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [jiraOAuth, setJiraOAuth] = useState(jiraOAuthConfigured);
  const [jiraSite, setJiraSite] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [jiraBusy, setJiraBusy] = useState(false);
  const [zohoOAuth, setZohoOAuth] = useState(zohoOAuthConfigured);
  const [zohoBusy, setZohoBusy] = useState(false);
  const [githubOAuth, setGitHubOAuth] = useState(githubOAuthConfigured);
  const [githubToken, setGitHubToken] = useState("");
  const [githubBusy, setGitHubBusy] = useState(false);
  const [outlookBusy, setOutlookBusy] = useState(false);

  async function load() {
    const [me, list] = await Promise.all([fetch("/api/me"), fetch("/api/connections")]);
    if (me.ok) {
      const body = await me.json();
      setEmail(body.email ?? null);
    }
    if (list.ok) {
      const body = await list.json();
      setConnections(body.connections ?? []);
      setJiraOAuth(Boolean(body.jiraOAuthConfigured));
      setZohoOAuth(Boolean(body.zohoOAuthConfigured));
      setGitHubOAuth(Boolean(body.githubOAuthConfigured));
    }
  }

  useEffect(() => {
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected === "microsoft_calendar") setMessage("Outlook Calendar connected.");
    else if (connected === "google_calendar") setMessage("Google Calendar connected.");
    else if (connected === "jira") setMessage("Jira connected.");
    else if (connected === "zoho_desk") setMessage("Zoho Desk connected.");
    else if (connected === "github") setMessage("GitHub connected.");
    else if (connected === "outlook") setMessage("Outlook Mail connected.");
    else if (connected) setMessage("Connected.");
    if (error === "microsoft_tenant") {
      setMessage(
        "This Azure app is single-tenant, so /common will not work. Set MICROSOFT_TENANT in .env.local to the Directory (tenant) ID from the app Overview page, then restart npm run dev.",
      );
    } else if (error === "microsoft_secret") {
      setMessage(
        "MICROSOFT_CLIENT_SECRET is wrong. In Azure Portal → App registration → Certificates & secrets, copy the secret Value (shown only once when created), not the Secret ID column. Update .env.local and restart npm run dev.",
      );
    } else if (error === "microsoft") {
      setMessage("Outlook connection failed. Check MICROSOFT_CLIENT_ID, secret, and redirect URI.");
    } else if (error === "jira") {
      setMessage("Jira connection failed. Check the site URL, email, and API token (or OAuth env vars).");
    } else if (error === "zoho") {
      setMessage("Zoho Desk connection failed. Check ZOHO_CLIENT_ID, secret, region URLs, and redirect URI.");
    } else if (error === "github") {
      setMessage("GitHub connection failed. Check the OAuth app or token permissions.");
    } else if (error === "outlook") {
      setMessage(
        "Outlook Mail connection failed. In Azure Portal, add the Mail.Read delegated permission (with admin consent) and register /api/integrations/outlook/callback as a redirect URI on the app.",
      );
    } else if (error === "google") {
      setMessage("Google Calendar connection failed. Check OAuth env vars.");
    } else if (error) {
      setMessage("Connection failed.");
    }
  }, [params]);

  async function sync() {
    setSyncing(true);
    setMessage(null);
    const response = await fetch("/api/calendar/sync", { method: "POST" });
    setSyncing(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error ?? "Sync failed.");
      return;
    }
    const body = await response.json();
    setMessage(`Imported ${body.imported} events.`);
  }

  async function disconnect(
    provider: "google_calendar" | "microsoft_calendar" | "jira" | "zoho_desk" | "github" | "outlook",
  ) {
    const label = providerLabels[provider] ?? provider;
    if (!window.confirm(`Disconnect ${label}? Stored tokens are deleted.`)) return;
    await fetch(`/api/connections/${provider}`, { method: "DELETE" });
    await load();
  }

  async function syncJira() {
    setJiraBusy(true);
    setMessage(null);
    const response = await fetch("/api/jira/sync", { method: "POST" });
    setJiraBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error ?? "Jira sync failed.");
      return;
    }
    const body = await response.json();
    setMessage(`Imported ${body.imported} Jira issues.`);
  }

  async function connectJiraToken(event: React.FormEvent) {
    event.preventDefault();
    setJiraBusy(true);
    setMessage(null);
    const response = await fetch("/api/integrations/jira/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteUrl: jiraSite,
        email: jiraEmail,
        apiToken: jiraToken,
      }),
    });
    setJiraBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(typeof body.error === "string" ? body.error : "Jira API token was rejected.");
      return;
    }
    setJiraToken("");
    const body = await response.json();
    setMessage(`Jira connected. Imported ${body.imported} issues.`);
    await load();
  }

  async function syncZoho() {
    setZohoBusy(true);
    setMessage(null);
    const response = await fetch("/api/zoho/sync", { method: "POST" });
    setZohoBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error ?? "Zoho Desk sync failed.");
      return;
    }
    const body = await response.json();
    setMessage(`Imported ${body.imported} Zoho tickets.`);
  }

  async function syncGitHub() {
    setGitHubBusy(true);
    setMessage(null);
    const response = await fetch("/api/github/sync", { method: "POST" });
    setGitHubBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error ?? "GitHub sync failed.");
      return;
    }
    const body = await response.json();
    setMessage(`Imported ${body.imported} GitHub items.`);
  }

  async function connectGitHubToken(event: React.FormEvent) {
    event.preventDefault();
    setGitHubBusy(true);
    setMessage(null);
    const response = await fetch("/api/integrations/github/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: githubToken }),
    });
    setGitHubBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(typeof body.error === "string" ? body.error : "GitHub token was rejected.");
      return;
    }
    setGitHubToken("");
    const body = await response.json();
    setMessage(`GitHub connected. Imported ${body.imported} items.`);
    await load();
  }

  async function syncOutlook() {
    setOutlookBusy(true);
    setMessage(null);
    const response = await fetch("/api/outlook/sync", { method: "POST" });
    setOutlookBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error ?? "Outlook Mail sync failed.");
      return;
    }
    const body = await response.json();
    setMessage(`Imported ${body.imported} Outlook messages.`);
  }

  const google = connections.find((item) => item.provider === "google_calendar");
  const outlook = connections.find((item) => item.provider === "microsoft_calendar");
  const jira = connections.find((item) => item.provider === "jira");
  const zoho = connections.find((item) => item.provider === "zoho_desk");
  const github = connections.find((item) => item.provider === "github");
  const outlookMail = connections.find((item) => item.provider === "outlook");

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle={email ? `Signed in as ${email}` : "Connections for this personal cockpit."}
      />

      <div aria-live="polite">
        {message ? <p className="mb-3 text-sm text-muted-foreground">{message}</p> : null}
      </div>

      <div className="grid max-w-3xl gap-3">
        <CalendarPanel
          title="Outlook Calendar"
          subtitle="Microsoft Graph, read-only. Work or personal Outlook."
          connected={Boolean(outlook)}
          connectHref="/api/integrations/microsoft/start"
          connectLabel="Connect Outlook Calendar"
          onSync={sync}
          onDisconnect={() => disconnect("microsoft_calendar")}
          syncing={syncing}
        />

        <CalendarPanel
          title="Google Calendar"
          subtitle="Read-only. You can keep both calendars connected."
          connected={Boolean(google)}
          connectHref="/api/integrations/google/start"
          connectLabel="Connect Google Calendar"
          onSync={sync}
          onDisconnect={() => disconnect("google_calendar")}
          syncing={syncing}
        />

        <Panel>
          <PanelHeader
            title="Jira"
            subtitle="Read-only assigned issues. Status and due dates stay in Jira."
            trailing={
              jira ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-foreground">
                  <Check className="size-3" aria-hidden="true" />
                  Connected
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  Not connected
                </span>
              )
            }
          />
          {jira ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={syncJira}
                disabled={jiraBusy}
                className={syncButtonClass}
              >
                <RefreshCw
                  aria-hidden="true"
                  className={cn("size-4", jiraBusy && "animate-spin motion-reduce:animate-none")}
                />
                {jiraBusy ? "Syncing…" : "Sync Jira"}
              </button>
              <button
                type="button"
                onClick={() => disconnect("jira")}
                className={secondaryButtonClass}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {jiraOAuth ? (
                <a href="/api/integrations/jira/start" className={connectLinkClass}>
                  Connect With Atlassian
                </a>
              ) : null}
              <form className="grid gap-2" onSubmit={connectJiraToken}>
                <label className="grid gap-1">
                  <span className="sr-only">Jira site URL</span>
                  <input
                    required
                    type="url"
                    name="jira-site"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="https://your-site.atlassian.net"
                    value={jiraSite}
                    onChange={(e) => setJiraSite(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="sr-only">Atlassian account email</span>
                  <input
                    required
                    type="email"
                    name="jira-email"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Atlassian account email, e.g. you@company.com"
                    value={jiraEmail}
                    onChange={(e) => setJiraEmail(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="sr-only">Jira API token</span>
                  <input
                    required
                    type="password"
                    name="jira-token"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="API token"
                    value={jiraToken}
                    onChange={(e) => setJiraToken(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <button
                  type="submit"
                  disabled={jiraBusy}
                  className="inline-flex h-9 w-fit items-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none disabled:opacity-60"
                >
                  {jiraBusy ? "Connecting…" : "Connect With API Token"}
                </button>
              </form>
              <EmptyHint>
                Create a token at id.atlassian.com → Security → API tokens. The cockpit never writes
                back to Jira.
              </EmptyHint>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Zoho Desk"
            subtitle="Open tickets, read-only. A later AI/write agent can use a second OAuth client."
            trailing={
              zoho ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-foreground">
                  <Check className="size-3" aria-hidden="true" />
                  Connected
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  Not connected
                </span>
              )
            }
          />
          {zoho ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={syncZoho}
                disabled={zohoBusy}
                className={syncButtonClass}
              >
                <RefreshCw
                  aria-hidden="true"
                  className={cn("size-4", zohoBusy && "animate-spin motion-reduce:animate-none")}
                />
                {zohoBusy ? "Syncing…" : "Sync Zoho Desk"}
              </button>
              <button
                type="button"
                onClick={() => disconnect("zoho_desk")}
                className={secondaryButtonClass}
              >
                Disconnect
              </button>
            </div>
          ) : zohoOAuth ? (
            <div className="grid gap-3">
              <a href="/api/integrations/zoho/start" className={connectLinkClass}>
                Connect Zoho Desk
              </a>
              <EmptyHint>
                Add this redirect URI on the Zoho client: /api/integrations/zoho/callback.
                Sync imports open tickets across the org. Optional: ZOHO_ASSIGNEE_ID to filter by
                agent, ZOHO_STATUS_TYPES to widen the scope.
              </EmptyHint>
            </div>
          ) : (
            <EmptyHint>
              Add ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET to .env.local (your current read-only Desk
              app is enough). Restart the server, then connect here. Keep a second Zoho client for
              any future write/AI agent.
            </EmptyHint>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="GitHub"
            subtitle="Open assigned issues, authored pull requests, and review requests. Read-only."
            trailing={
              github ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-foreground">
                  <Check className="size-3" aria-hidden="true" />
                  Connected
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  Not connected
                </span>
              )
            }
          />
          {github ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={syncGitHub}
                disabled={githubBusy}
                className={syncButtonClass}
              >
                <RefreshCw
                  aria-hidden="true"
                  className={cn("size-4", githubBusy && "animate-spin motion-reduce:animate-none")}
                />
                {githubBusy ? "Syncing…" : "Sync GitHub"}
              </button>
              <button
                type="button"
                onClick={() => disconnect("github")}
                className={secondaryButtonClass}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {githubOAuth ? (
                <a href="/api/integrations/github/start" className={connectLinkClass}>
                  Connect With GitHub
                </a>
              ) : null}
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={connectGitHubToken}>
                <label className="grid min-w-0 flex-1 gap-1">
                  <span className="sr-only">GitHub personal access token</span>
                  <input
                    required
                    type="password"
                    name="github-token"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Fine-grained personal access token"
                    value={githubToken}
                    onChange={(event) => setGitHubToken(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <button
                  type="submit"
                  disabled={githubBusy}
                  className="inline-flex h-9 w-fit items-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none disabled:opacity-60"
                >
                  {githubBusy ? "Connecting…" : "Connect Token"}
                </button>
              </form>
              <EmptyHint>
                For private repositories, create a fine-grained token with repository access and
                read-only Metadata, Issues, and Pull requests permissions.
              </EmptyHint>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Outlook Mail"
            subtitle="Unread Focused-inbox mail plus your Kiva folder. Read-only, other/clutter mail is skipped."
            trailing={
              outlookMail ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-foreground">
                  <Check className="size-3" aria-hidden="true" />
                  Connected
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  Not connected
                </span>
              )
            }
          />
          {outlookMail ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={syncOutlook}
                disabled={outlookBusy}
                className={syncButtonClass}
              >
                <RefreshCw
                  aria-hidden="true"
                  className={cn("size-4", outlookBusy && "animate-spin motion-reduce:animate-none")}
                />
                {outlookBusy ? "Syncing…" : "Sync Outlook Mail"}
              </button>
              <button
                type="button"
                onClick={() => disconnect("outlook")}
                className={secondaryButtonClass}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              <a href="/api/integrations/outlook/start" className={connectLinkClass}>
                Connect Outlook Mail
              </a>
              <EmptyHint>
                Same Azure app as Outlook Calendar. In Azure Portal, add the Mail.Read delegated
                permission with admin consent, and register /api/integrations/outlook/callback as a
                redirect URI.
              </EmptyHint>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Sources" subtitle="What is live and what is queued" />
          <div className="grid gap-2">
            {implementedProviders.map((provider) => (
              <div
                key={provider}
                className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-3 py-2.5"
              >
                <span className="min-w-0 truncate text-sm font-medium">
                  {providerLabels[provider] ?? provider}
                </span>
                <span className="shrink-0 text-xs font-medium text-brand-accent">Live</span>
              </div>
            ))}
            {deferredProviders.map((provider) => (
              <div
                key={provider}
                className="flex items-center justify-between gap-3 rounded-2xl bg-muted/20 px-3 py-2.5"
              >
                <span className="min-w-0 truncate text-sm text-muted-foreground">
                  {providerLabels[provider] ?? provider}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">Later slice</span>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <EmptyHint>
              The connector registry rejects deferred providers, so a half-built source cannot
              quietly write into your task list.
            </EmptyHint>
          </div>
        </Panel>
      </div>
    </>
  );
}

function CalendarPanel({
  title,
  subtitle,
  connected,
  connectHref,
  connectLabel,
  onSync,
  onDisconnect,
  syncing,
}: {
  title: string;
  subtitle: string;
  connected: boolean;
  connectHref: string;
  connectLabel: string;
  onSync: () => void;
  onDisconnect: () => void;
  syncing: boolean;
}) {
  return (
    <Panel>
      <PanelHeader
        title={title}
        subtitle={subtitle}
        trailing={
          connected ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-foreground">
              <Check className="size-3" aria-hidden="true" />
              Connected
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Not connected
            </span>
          )
        }
      />
      {connected ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            className={syncButtonClass}
          >
            <RefreshCw
              aria-hidden="true"
              className={cn("size-4", syncing && "animate-spin motion-reduce:animate-none")}
            />
            {syncing ? "Syncing…" : "Sync Calendars"}
          </button>
          <button type="button" onClick={onDisconnect} className={secondaryButtonClass}>
            Disconnect
          </button>
        </div>
      ) : (
        <a href={connectHref} className={connectLinkClass}>
          {connectLabel}
        </a>
      )}
    </Panel>
  );
}
