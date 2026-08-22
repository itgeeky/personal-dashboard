import { AppShell } from "@/components/app-shell";
import { currentUserEmail } from "@/lib/current-user";
import { getDashboardSnapshot } from "@/server/services/load-dashboard";
import { CalendarClient } from "./calendar-client";

export default async function CalendarPage() {
  const [email, snapshot] = await Promise.all([currentUserEmail(), getDashboardSnapshot()]);
  return (
    <AppShell email={email}>
      <CalendarClient initialData={snapshot} />
    </AppShell>
  );
}
