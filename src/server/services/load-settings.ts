import { cache } from "react";
import {
  githubOAuthConfigured,
  jiraOAuthConfigured,
  zohoOAuthConfigured,
} from "@/server/connectors/oauth-flags";
import { getAuth } from "@/lib/current-user";
import { listConnections } from "./connections";

export const getSettingsSnapshot = cache(async () => {
  const { user, supabase } = await getAuth();
  if (!user || !supabase) {
    return {
      connections: [] as Awaited<ReturnType<typeof listConnections>>,
      jiraOAuthConfigured: jiraOAuthConfigured(),
      zohoOAuthConfigured: zohoOAuthConfigured(),
      githubOAuthConfigured: githubOAuthConfigured(),
    };
  }
  const connections = await listConnections(supabase, user.id);
  return {
    connections,
    jiraOAuthConfigured: jiraOAuthConfigured(),
    zohoOAuthConfigured: zohoOAuthConfigured(),
    githubOAuthConfigured: githubOAuthConfigured(),
  };
});
