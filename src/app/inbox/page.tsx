import { AppShell } from "@/components/app-shell";
import { currentUserEmail } from "@/lib/current-user";
import { getDashboardSnapshot } from "@/server/services/load-dashboard";
import { InboxClient } from "./inbox-client";

export default async function InboxPage() {
  const [email, snapshot] = await Promise.all([currentUserEmail(), getDashboardSnapshot()]);
  return (
    <AppShell email={email}>
      <InboxClient initialData={snapshot} />
    </AppShell>
  );
}
