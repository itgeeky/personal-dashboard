import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskSource, WorkItemStatus } from "@/domain/enums";
import type { CreateManualTaskInput } from "@/domain/types";
import type { NormalizedExternalTask } from "@/server/connectors/types";
import { mergeItems, type OverlayRow, type WorkItemRow } from "@/lib/db/types";

export async function listWorkItems(supabase: SupabaseClient, userId: string) {
  const { data: items, error } = await supabase
    .from("work_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: overlays, error: overlayError } = await supabase
    .from("work_item_overlays")
    .select("*")
    .eq("user_id", userId);
  if (overlayError) throw overlayError;

  return mergeItems((items ?? []) as WorkItemRow[], (overlays ?? []) as OverlayRow[]);
}

export async function createManualTask(
  supabase: SupabaseClient,
  userId: string,
  input: CreateManualTaskInput,
) {
  const status: WorkItemStatus = input.status ?? "open";
  const { data, error } = await supabase
    .from("work_items")
    .insert({
      user_id: userId,
      source: "manual",
      kind: "task",
      title: input.title.trim(),
      description: input.description ?? null,
      status,
      priority: input.priority ?? "none",
      due_at: input.dueAt ?? null,
      estimated_minutes: input.estimatedMinutes ?? null,
      tags: input.tags ?? [],
      related_person: input.relatedPerson ?? null,
      related_project: input.relatedProject ?? null,
      completed_at: status === "done" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();
  if (error) throw error;

  const waitingSince =
    status === "waiting_for" ? new Date().toISOString() : null;

  const { error: overlayError } = await supabase.from("work_item_overlays").insert({
    work_item_id: data.id,
    user_id: userId,
    notes: input.notes ?? null,
    reminder_at: input.reminderAt ?? null,
    waiting_for_person: input.waitingForPerson ?? null,
    waiting_for_expected: input.waitingForExpected ?? null,
    waiting_since: waitingSince,
  });
  if (overlayError) throw overlayError;

  const items = await listWorkItems(supabase, userId);
  return items.find((item) => item.id === data.id)!;
}

export async function updateTask(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: Partial<CreateManualTaskInput> & { nextAction?: string | null },
) {
  const { data: current, error: currentError } = await supabase
    .from("work_items")
    .select("source")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (currentError) throw currentError;
  if (!current) return null;

  if (current.source === "manual") {
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.description !== undefined) patch.description = input.description;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.status !== undefined) {
      patch.status = input.status;
      patch.completed_at = input.status === "done" ? new Date().toISOString() : null;
    }
    if (input.dueAt !== undefined) patch.due_at = input.dueAt;
    if (input.estimatedMinutes !== undefined) patch.estimated_minutes = input.estimatedMinutes;
    if (input.tags !== undefined) patch.tags = input.tags;
    if (input.relatedPerson !== undefined) patch.related_person = input.relatedPerson;
    if (input.relatedProject !== undefined) patch.related_project = input.relatedProject;

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase
        .from("work_items")
        .update(patch)
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    }
  }

  const overlayPatch: Record<string, unknown> = {};
  if (input.notes !== undefined) overlayPatch.notes = input.notes;
  if (input.reminderAt !== undefined) overlayPatch.reminder_at = input.reminderAt;
  if (input.waitingForPerson !== undefined) overlayPatch.waiting_for_person = input.waitingForPerson;
  if (input.waitingForExpected !== undefined) overlayPatch.waiting_for_expected = input.waitingForExpected;
  if (input.nextAction !== undefined) overlayPatch.next_action = input.nextAction;
  if (current.source === "manual" && input.status === "waiting_for") {
    overlayPatch.waiting_since = new Date().toISOString();
  }

  if (Object.keys(overlayPatch).length > 0) {
    const { error } = await supabase.from("work_item_overlays").upsert(
      {
        work_item_id: id,
        user_id: userId,
        ...overlayPatch,
      },
      { onConflict: "work_item_id" },
    );
    if (error) throw error;
  }

  const items = await listWorkItems(supabase, userId);
  return items.find((item) => item.id === id) ?? null;
}

export async function upsertExternalTasks(
  supabase: SupabaseClient,
  userId: string,
  source: TaskSource,
  incoming: NormalizedExternalTask[],
  /** When the source only returns open work, anything missing is finished elsewhere. */
  closeMissing = false,
) {
  const { data: existing, error: existingError } = await supabase
    .from("work_items")
    .select("id, external_id")
    .eq("user_id", userId)
    .eq("source", source);
  if (existingError) throw existingError;

  const byExternal = new Map(
    (existing ?? [])
      .filter((row) => row.external_id)
      .map((row) => [row.external_id as string, row.id as string]),
  );

  for (const item of incoming) {
    const knownId = byExternal.get(item.externalId);
    const row = {
      title: item.title,
      description: item.description,
      status: item.status,
      priority: item.priority,
      due_at: item.dueAt,
      related_project: item.relatedProject,
      related_person: item.relatedPerson ?? null,
      tags: item.tags,
      kind: "task",
      completed_at: item.status === "done" || item.status === "cancelled" ? new Date().toISOString() : null,
    };
    if (knownId) {
      const { error } = await supabase.from("work_items").update(row).eq("id", knownId).eq("user_id", userId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("work_items")
        .insert({
          user_id: userId,
          source,
          external_id: item.externalId,
          ...row,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: overlayError } = await supabase.from("work_item_overlays").insert({
        work_item_id: data.id,
        user_id: userId,
      });
      if (overlayError) throw overlayError;
    }
  }

  if (closeMissing) {
    const seen = new Set(incoming.map((item) => item.externalId));
    const stale = [...byExternal.entries()]
      .filter(([externalId]) => !seen.has(externalId))
      .map(([, id]) => id);
    if (stale.length > 0) {
      const { error } = await supabase
        .from("work_items")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .in("id", stale)
        .eq("user_id", userId);
      if (error) throw error;
    }
  }

  return incoming.length;
}

export async function snoozeWorkItem(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  snoozeUntil: string | null,
) {
  const { data: current, error: currentError } = await supabase
    .from("work_items")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (currentError) throw currentError;
  if (!current) return null;

  const { error } = await supabase.from("work_item_overlays").upsert(
    { work_item_id: id, user_id: userId, snooze_until: snoozeUntil },
    { onConflict: "work_item_id" },
  );
  if (error) throw error;

  const items = await listWorkItems(supabase, userId);
  return items.find((item) => item.id === id) ?? null;
}

export async function deleteManualTask(
  supabase: SupabaseClient,
  userId: string,
  id: string,
) {
  const { error } = await supabase
    .from("work_items")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .eq("source", "manual");
  if (error) throw error;
}
