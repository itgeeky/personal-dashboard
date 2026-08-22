import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import type { ConnectorProvider } from "@/domain/enums";
import type { OAuthTokens } from "@/server/connectors/types";

type ConnectionRow = {
  id: string;
  user_id: string;
  provider: ConnectorProvider;
  encrypted_tokens: string;
  metadata: Record<string, unknown>;
};

export async function upsertConnection(
  supabase: SupabaseClient,
  userId: string,
  provider: ConnectorProvider,
  tokens: OAuthTokens,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await supabase.from("connections").upsert(
    {
      user_id: userId,
      provider,
      encrypted_tokens: encryptSecret(JSON.stringify(tokens)),
      metadata,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw error;
}

export async function getConnectionTokens(
  supabase: SupabaseClient,
  userId: string,
  provider: ConnectorProvider,
): Promise<{ id: string; tokens: OAuthTokens } | null> {
  const { data, error } = await supabase
    .from("connections")
    .select("id, encrypted_tokens")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const tokens = JSON.parse(decryptSecret(data.encrypted_tokens)) as OAuthTokens;
  return { id: data.id, tokens };
}

export async function listConnections(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("connections")
    .select("id, provider, created_at, updated_at")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function deleteConnection(
  supabase: SupabaseClient,
  userId: string,
  provider: ConnectorProvider,
) {
  const { error } = await supabase
    .from("connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) throw error;
}

export async function touchSyncCursor(
  supabase: SupabaseClient,
  userId: string,
  provider: ConnectorProvider,
  cursor: string | null,
) {
  const { error } = await supabase.from("sync_cursors").upsert(
    {
      user_id: userId,
      provider,
      cursor,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw error;
}

export type { ConnectionRow };
