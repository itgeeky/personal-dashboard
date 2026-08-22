import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { currentUserEmail } from "@/lib/current-user";
import { getSettingsSnapshot } from "@/server/services/load-settings";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const [email, settings] = await Promise.all([currentUserEmail(), getSettingsSnapshot()]);
  return (
    <AppShell email={email}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading settings...</p>}>
        <SettingsClient
          email={email}
          connections={settings.connections}
          jiraOAuthConfigured={settings.jiraOAuthConfigured}
          zohoOAuthConfigured={settings.zohoOAuthConfigured}
          githubOAuthConfigured={settings.githubOAuthConfigured}
        />
      </Suspense>
    </AppShell>
  );
}
