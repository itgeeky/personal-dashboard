import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StubPanel } from "@/components/stub-panel";
import { currentUserEmail } from "@/lib/current-user";

export default async function ReviewPage() {
  const email = await currentUserEmail();
  return (
    <AppShell email={email}>
      <PageHeader
        title="Close my day"
        subtitle="The evening counterpart to the morning dashboard."
      />
      <StubPanel
        slice="Stage 12"
        title="End-of-day review comes after the sources land"
        summary="A useful review needs completed work from several systems. Building it now would only summarize manual tasks."
        planned={[
          "What you completed today, grouped by source",
          "What slipped and should move to tomorrow",
          "Commitments made today that have no task yet",
          "Dependencies that went quiet and need a follow-up",
        ]}
      />
    </AppShell>
  );
}
