import { AppShell } from "@/components/app-shell";
import { currentUserEmail } from "@/lib/current-user";
import { AgentView } from "./agent-view";

export default async function AgentPage() {
  const email = await currentUserEmail();
  return (
    <AppShell email={email}>
      <AgentView email={email} />
    </AppShell>
  );
}
