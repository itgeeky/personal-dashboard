"use client";

import { useMemo } from "react";
import { ExternalLink, EyeOff, ListPlus } from "lucide-react";
import { EmptyHint, Panel, PanelHeader } from "@/components/panel";
import { PageHeader } from "@/components/page-header";
import type { DashboardSnapshot, WorkItemWithOverlay } from "@/domain/types";
import { truncateText } from "@/lib/display";
import { useDashboard } from "@/lib/use-dashboard";

function isWebLink(raw: unknown): raw is { webLink: string } {
  return Boolean(raw && typeof raw === "object" && "webLink" in raw);
}

function InboxRow({ item, onChanged }: { item: WorkItemWithOverlay; onChanged: () => void }) {
  async function convertToTask() {
    await fetch(`/api/tasks/${item.id}/convert-to-task`, { method: "POST" });
    onChanged();
  }

  async function ignore() {
    await fetch(`/api/tasks/${item.id}/ignore`, { method: "POST" });
    onChanged();
  }

  const webLink = isWebLink(item.raw) ? item.raw.webLink : null;

  return (
    <div className="flex w-full min-w-0 items-start gap-3 rounded-2xl bg-muted/40 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={item.title}>
          {item.title}
        </p>
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {item.relatedPerson ?? "Unknown sender"}
        </p>
        {item.description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {truncateText(item.description, 160)}
          </p>
        ) : null}
        {webLink ? (
          <a
            href={webLink}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-accent hover:underline"
          >
            <ExternalLink className="size-3" aria-hidden="true" />
            Open in Outlook
          </a>
        ) : null}
      </div>

      <div className="mt-0.5 flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={convertToTask}
          aria-label={`Convert "${item.title}" to a task`}
          title="Convert to task"
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-brand hover:text-brand-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
        >
          <ListPlus className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={ignore}
          aria-label={`Ignore "${item.title}"`}
          title="Ignore"
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:outline-none"
        >
          <EyeOff className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function InboxClient({ initialData }: { initialData?: DashboardSnapshot | null }) {
  const { data, loading, error, reload } = useDashboard(initialData);

  const { kiva, other } = useMemo(() => {
    const items = data?.inbox ?? [];
    return {
      kiva: items.filter((item) => item.relatedProject === "Kiva"),
      other: items.filter((item) => item.relatedProject !== "Kiva"),
    };
  }, [data]);

  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle="Unread mail that isn't tucked away in the ignorable Other pile: your Outlook Focused inbox and the Kiva folder."
      />

      {error ? (
        <Panel className="mb-3">
          <EmptyHint>{error}</EmptyHint>
        </Panel>
      ) : null}

      <div className="grid gap-3">
        <Panel>
          <PanelHeader title="Kiva" subtitle={`${kiva.length} unread`} />
          {loading ? (
            <EmptyHint>Loading…</EmptyHint>
          ) : kiva.length === 0 ? (
            <EmptyHint>Nothing unread in Kiva.</EmptyHint>
          ) : (
            <div className="grid gap-2">
              {kiva.map((item) => (
                <InboxRow key={item.id} item={item} onChanged={reload} />
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Focused inbox" subtitle={`${other.length} unread`} />
          {loading ? (
            <EmptyHint>Loading…</EmptyHint>
          ) : other.length === 0 ? (
            <EmptyHint>Nothing needs a look right now.</EmptyHint>
          ) : (
            <div className="grid gap-2">
              {other.map((item) => (
                <InboxRow key={item.id} item={item} onChanged={reload} />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
