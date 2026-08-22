import { AppShell } from "@/components/app-shell";
import { DashboardView } from "@/components/dashboard-view";
import { currentUserEmail } from "@/lib/current-user";
import { getDashboardSnapshot } from "@/server/services/load-dashboard";

export default async function HomePage() {
  const [email, snapshot] = await Promise.all([currentUserEmail(), getDashboardSnapshot()]);

  return (
    <AppShell email={email}>
      <DashboardView email={email} initialData={snapshot} />
    </AppShell>
  );
}
