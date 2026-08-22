import { AppShell } from "@/components/app-shell";
import { currentUserEmail } from "@/lib/current-user";
import { getDashboardSnapshot } from "@/server/services/load-dashboard";
import { WaitingClient } from "./waiting-client";

export default async function WaitingPage() {
  const [email, snapshot] = await Promise.all([currentUserEmail(), getDashboardSnapshot()]);
  return (
    <AppShell email={email}>
      <WaitingClient initialData={snapshot} />
    </AppShell>
  );
}
