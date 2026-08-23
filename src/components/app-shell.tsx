import { AppShellClient } from "@/components/app-shell-client";
import { getSidebarDefaultOpen } from "@/lib/sidebar-state.server";

export async function AppShell({
  email,
  children,
}: {
  email?: string | null;
  children: React.ReactNode;
}) {
  const defaultOpen = await getSidebarDefaultOpen();

  return (
    <AppShellClient email={email} defaultOpen={defaultOpen}>
      {children}
    </AppShellClient>
  );
}
