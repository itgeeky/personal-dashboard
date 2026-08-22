import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StubPanel } from "@/components/stub-panel";
import { currentUserEmail } from "@/lib/current-user";

export default async function InboxPage() {
  const email = await currentUserEmail();
  return (
    <AppShell email={email}>
      <PageHeader
        title="Inbox"
        subtitle="Untriaged items discovered automatically, kept separate from committed tasks."
      />
      <StubPanel
        slice="Later slice"
        title="Outlook triage is not wired yet"
        summary="Outlook mail may be added later; until then this screen stays empty on purpose."
        planned={[
          "Outlook metadata and snippets",
          "Rule-based signals first: unread, direct recipient, labels",
          "Convert to task, mark waiting for, ignore, snooze",
          "AI classification and commitment detection arrive in slice 8",
        ]}
      />
    </AppShell>
  );
}
