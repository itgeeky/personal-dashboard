import { AppShell } from "@/components/app-shell";
import { currentUserEmail } from "@/lib/current-user";
import { getDashboardSnapshot } from "@/server/services/load-dashboard";
import { TasksClient } from "./tasks-client";

export default async function TasksPage() {
  const [email, snapshot] = await Promise.all([currentUserEmail(), getDashboardSnapshot()]);
  return (
    <AppShell email={email}>
      <TasksClient initialData={snapshot} />
    </AppShell>
  );
}
