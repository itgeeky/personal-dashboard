import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CircleHelp,
  CloudCog,
  ListChecks,
  LockKeyhole,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelHeader } from "@/components/panel";
import { currentUserEmail } from "@/lib/current-user";

const workflow = [
  {
    number: "01",
    title: "Connect your sources",
    body: "Add calendars and read-only work systems in Settings. Tokens are encrypted before storage.",
  },
  {
    number: "02",
    title: "Sync before planning",
    body: "Refresh calendars, Jira, Zoho Desk, and GitHub so the dashboard sees current work.",
  },
  {
    number: "03",
    title: "Choose the next action",
    body: "Use Attention and Do this first as signals, then block the work into available time.",
  },
  {
    number: "04",
    title: "Track dependencies",
    body: "Move manual work to Waiting for when another person or system is blocking progress.",
  },
];

export default async function HelpPage() {
  const email = await currentUserEmail();

  return (
    <AppShell email={email}>
      <PageHeader
        title="Help & guide"
        subtitle="How to use the cockpit, connect sources, and diagnose a quiet dashboard."
        actions={
          <Link
            href="/settings"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
          >
            Open Settings <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="grid content-start gap-3">
          <Panel className="overflow-hidden bg-foreground text-background ring-0">
            <div className="grid gap-8 md:grid-cols-[1fr_220px] md:items-end">
              <div>
                <span
                  aria-hidden="true"
                  className="inline-flex size-9 items-center justify-center rounded-xl bg-brand text-brand-foreground"
                >
                  <CircleHelp className="size-4" />
                </span>
                <h2 className="mt-6 max-w-xl text-3xl font-semibold tracking-tight text-balance">
                  The cockpit is an intelligence layer, not another system to maintain.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-background/65">
                  External status stays in the source that owns it. The cockpit combines that data
                  with your calendar and private notes to make the day easier to navigate.
                </p>
              </div>
              <div className="rounded-2xl bg-background/8 p-4 text-xs leading-5 text-background/65 ring-1 ring-background/10">
                Start each morning with Dashboard, work from Tasks, and use Waiting to keep
                dependencies from disappearing.
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Daily workflow" subtitle="A four-step routine that keeps data useful" />
            <div className="grid gap-2 md:grid-cols-2">
              {workflow.map((step) => (
                <div key={step.number} className="rounded-2xl bg-muted/45 p-4">
                  <span className="text-xs font-semibold text-brand-foreground">{step.number}</span>
                  <h3 className="mt-4 text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{step.body}</p>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-3 md:grid-cols-3">
            <GuideCard
              icon={CalendarDays}
              title="Calendar"
              body="Meetings define capacity; they never become tasks automatically."
              href="/calendar"
            />
            <GuideCard
              icon={ListChecks}
              title="Tasks"
              body="Manual work is editable. Jira, Zoho, and GitHub remain read-only."
              href="/tasks"
            />
            <GuideCard
              icon={Sparkles}
              title="Agent"
              body="The Agent workspace is ready for a future model and tool backend."
              href="/agent"
            />
          </div>
        </div>

        <aside className="grid content-start gap-3">
          <Panel>
            <PanelHeader title="Connection checklist" />
            <div className="grid gap-3">
              <Check icon={CloudCog} text="Configure or paste credentials in Settings." />
              <Check icon={RefreshCw} text="Run a manual sync after connecting." />
              <Check icon={LockKeyhole} text="Prefer read-only, fine-grained permissions." />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Diagnostics" subtitle="Useful when a sync imports zero items" />
            <div className="grid gap-2">
              <Diagnostic href="/api/github/debug" label="GitHub counts" />
              <Diagnostic href="/api/zoho/debug" label="Zoho status scope" />
              <Diagnostic href="/api/health" label="API health" />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              These responses contain connection metadata and counts, never stored access tokens.
            </p>
          </Panel>

          <Panel>
            <PanelHeader title="Data ownership" />
            <p className="text-sm leading-6 text-muted-foreground">
              Jira, Zoho Desk, GitHub, and your calendars stay canonical. Only manual tasks and
              cockpit overlays—notes, reminders, and waiting context—are edited here.
            </p>
          </Panel>
        </aside>
      </div>
    </AppShell>
  );
}

function GuideCard({
  icon: Icon,
  title,
  body,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl bg-card p-5 ring-1 ring-foreground/5 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
    >
      <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      <h2 className="mt-6 text-base font-semibold">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
    </Link>
  );
}

function Check({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted"
      >
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <p className="pt-1 text-sm leading-5">{text}</p>
    </div>
  );
}

function Diagnostic({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-3 rounded-2xl bg-muted/45 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
    >
      <span className="min-w-0 truncate">{label}</span>
      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </a>
  );
}
