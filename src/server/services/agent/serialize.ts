import { localDateLabel, localTimeLabel, localizeBlock, localizeEvent } from "@/domain/calendar";
import type { DashboardSnapshot, TimeBlock, WorkItemWithOverlay } from "@/domain/types";

/**
 * Re-shapes a DashboardSnapshot for LLM consumption: every timestamp becomes an
 * already-local string. The raw ISO snapshot (used by the UI, which formats
 * dates client-side) is left untouched — this only guards the agent/briefing
 * boundary, where the model previously had to convert UTC itself and got it wrong.
 */
export function describeSnapshotForAgent(snapshot: DashboardSnapshot) {
  const timeZone = snapshot.timezone;

  return {
    generatedAt: `${localDateLabel(snapshot.generatedAt, timeZone)} ${localTimeLabel(snapshot.generatedAt, timeZone)}`,
    timezone: timeZone,
    attention: snapshot.attention.map((item) => ({
      ...item,
      dueAt: item.dueAt ? `${localDateLabel(item.dueAt, timeZone)} ${localTimeLabel(item.dueAt, timeZone)}` : null,
    })),
    pending: snapshot.pending.map((item) => localizeWorkItem(item, timeZone)),
    waitingFor: snapshot.waitingFor.map((item) => localizeWorkItem(item, timeZone)),
    today: {
      events: snapshot.today.events.map((event) => localizeEvent(event, timeZone)),
      busy: snapshot.today.busy.map((block) => localizeBlock(block, timeZone)),
      free: snapshot.today.free.map((block) => localizeBlock(block, timeZone)),
    },
    recommendation: snapshot.recommendation.map((rec) => ({
      ...rec,
      suggestedBlock: localizeSuggestedBlock(rec.suggestedBlock, timeZone),
    })),
  };
}

function localizeWorkItem(item: WorkItemWithOverlay, timeZone: string) {
  return {
    ...item,
    dueAt: item.dueAt ? `${localDateLabel(item.dueAt, timeZone)} ${localTimeLabel(item.dueAt, timeZone)}` : null,
  };
}

function localizeSuggestedBlock(block: TimeBlock | null, timeZone: string) {
  return block ? localizeBlock(block, timeZone) : null;
}
