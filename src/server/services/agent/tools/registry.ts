import type { SupabaseClient } from "@supabase/supabase-js";
import { workItemPriorities, workItemStatuses, type TaskSource, type WorkItemPriority, type WorkItemStatus } from "@/domain/enums";
import type { ToolDefinition } from "@/domain/agent/types";
import type { CreateManualTaskInput } from "@/domain/types";
import {
  endOfLocalDay,
  localDateLabel,
  localDateTimeToIso,
  localizeBlock,
  localizeEvent,
  startOfLocalDay,
} from "@/domain/calendar";
import { userTimeZone } from "@/lib/env";
import { agendaForDay, agendaForRange, listCalendarEvents } from "@/server/services/calendar";
import { buildDashboard } from "@/server/services/dashboard";
import { describeSnapshotForAgent } from "@/server/services/agent/serialize";
import { createManualTask, listWorkItems, snoozeWorkItem } from "@/server/services/tasks";

const MS_DAY = 24 * 60 * 60 * 1000;

/** Parses an optional local "YYYY-MM-DD HH:mm" arg into a UTC ISO string, or null. */
function optionalLocalDateTime(value: unknown, timeZone: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  return localDateTimeToIso(String(value), timeZone);
}

/**
 * Agent tools read synced cockpit data (Supabase). Live connector calls stay in
 * Settings sync flows; the agent works on the normalized snapshot already stored.
 */
export function createAgentTools(supabase: SupabaseClient, userId: string): ToolDefinition[] {
  const timeZone = userTimeZone();

  return [
    {
      name: "get_dashboard_snapshot",
      description:
        "Obtiene el snapshot del cockpit: atención inmediata, pendientes, waiting for, agenda de hoy y recomendación priorizada.",
      parameters: { type: "object", properties: {} },
      execute: async () => describeSnapshotForAgent(await buildDashboard(supabase, userId)),
    },
    {
      name: "list_work_items",
      description:
        "Lista tareas sincronizadas desde Jira, Zoho Desk, GitHub o captura manual. El estado de fuentes externas solo cambia al sincronizar desde la fuente (Settings).",
      parameters: {
        type: "object",
        properties: {
          source: {
            type: "string",
            description: "Fuente: jira, zoho_desk, github, manual",
          },
          status: {
            type: "string",
            description: "Estado: open, in_progress, waiting_for, done, cancelled",
          },
        },
      },
      execute: async (args) => {
        let items = await listWorkItems(supabase, userId);
        const source = args.source as TaskSource | undefined;
        const status = args.status as WorkItemStatus | undefined;
        if (source) items = items.filter((item) => item.source === source);
        if (status) items = items.filter((item) => item.status === status);
        return items;
      },
    },
    {
      name: "list_calendar_events",
      description:
        "Lista reuniones del calendario sincronizado. days=1 devuelve solo hoy con bloques libres/ocupados; days=7 devuelve la semana (hoy + 6 días) día por día.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "Días desde hoy (1–14). Default 1 (solo hoy). Usa 7 para esta semana.",
          },
        },
      },
      execute: async (args) => {
        const now = new Date();
        const days = Math.min(14, Math.max(1, Number(args.days) || 1));
        const rangeStart = startOfLocalDay(now, timeZone);
        const rangeEnd = endOfLocalDay(new Date(now.getTime() + (days - 1) * MS_DAY), timeZone);

        const events = await listCalendarEvents(
          supabase,
          userId,
          new Date(rangeStart.getTime() - MS_DAY),
          new Date(rangeEnd.getTime() + MS_DAY),
        );

        if (days === 1) {
          const agenda = agendaForDay(events, now, timeZone);
          return {
            timezone: timeZone,
            date: localDateLabel(now, timeZone),
            events: agenda.events.map((event) => localizeEvent(event, timeZone)),
            busy: agenda.busy.map((block) => localizeBlock(block, timeZone)),
            free: agenda.free.map((block) => localizeBlock(block, timeZone)),
          };
        }

        const range = agendaForRange(events, rangeStart, rangeEnd, timeZone);
        return {
          timezone: range.timezone,
          rangeStart: localDateLabel(range.rangeStart, timeZone),
          rangeEnd: localDateLabel(range.rangeEnd, timeZone),
          days: range.days.map((day) => ({
            date: localDateLabel(day.date, timeZone),
            events: day.events.map((event) => localizeEvent(event, timeZone)),
            busy: day.busy.map((block) => localizeBlock(block, timeZone)),
            free: day.free.map((block) => localizeBlock(block, timeZone)),
          })),
        };
      },
    },
    {
      name: "add_work_item",
      description:
        "Crea una tarea manual (fuente 'manual') en el cockpit. Úsala cuando el usuario pida agregar, crear o capturar una tarea nueva.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título de la tarea (obligatorio)." },
          description: { type: "string", description: "Detalle opcional." },
          priority: {
            type: "string",
            enum: [...workItemPriorities],
            description: "Prioridad. Default: none.",
          },
          status: {
            type: "string",
            enum: [...workItemStatuses],
            description: "Estado inicial. Default: open.",
          },
          dueAt: {
            type: "string",
            description: "Fecha límite, hora local 'YYYY-MM-DD HH:mm'.",
          },
          estimatedMinutes: { type: "number", description: "Duración estimada en minutos." },
          tags: { type: "array", items: { type: "string" }, description: "Etiquetas libres." },
          relatedPerson: { type: "string", description: "Persona relacionada." },
          relatedProject: { type: "string", description: "Proyecto relacionado." },
          notes: { type: "string", description: "Notas internas del cockpit." },
          reminderAt: {
            type: "string",
            description: "Recordatorio, hora local 'YYYY-MM-DD HH:mm'.",
          },
          waitingForPerson: {
            type: "string",
            description: "Si status es waiting_for, de quién se espera respuesta.",
          },
          waitingForExpected: {
            type: "string",
            description: "Qué se espera recibir de esa persona.",
          },
        },
        required: ["title"],
      },
      execute: async (args) => {
        const title = typeof args.title === "string" ? args.title.trim() : "";
        if (!title) return { error: "Falta 'title'." };

        const input: CreateManualTaskInput = {
          title,
          description: (args.description as string | undefined) ?? null,
          priority: args.priority as WorkItemPriority | undefined,
          status: args.status as WorkItemStatus | undefined,
          dueAt: optionalLocalDateTime(args.dueAt, timeZone),
          estimatedMinutes: args.estimatedMinutes != null ? Number(args.estimatedMinutes) : null,
          tags: Array.isArray(args.tags) ? (args.tags as string[]) : undefined,
          relatedPerson: (args.relatedPerson as string | undefined) ?? null,
          relatedProject: (args.relatedProject as string | undefined) ?? null,
          notes: (args.notes as string | undefined) ?? null,
          reminderAt: optionalLocalDateTime(args.reminderAt, timeZone),
          waitingForPerson: (args.waitingForPerson as string | undefined) ?? null,
          waitingForExpected: (args.waitingForExpected as string | undefined) ?? null,
        };

        return createManualTask(supabase, userId, input);
      },
    },
    {
      name: "snooze_work_item",
      description:
        "Pospone (snooze) un work item hasta una fecha/hora: deja de aparecer en pendientes y atención hasta entonces. Sin 'snoozeUntil' quita el snooze.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "id (uuid) del work item." },
          snoozeUntil: {
            type: "string",
            description:
              "Hora local 'YYYY-MM-DD HH:mm' hasta la que posponer. Omite o deja vacío para quitar el snooze.",
          },
        },
        required: ["id"],
      },
      execute: async (args) => {
        const id = typeof args.id === "string" ? args.id.trim() : "";
        if (!id) return { error: "Falta 'id'." };

        const snoozeUntil = optionalLocalDateTime(args.snoozeUntil, timeZone);
        const updated = await snoozeWorkItem(supabase, userId, id, snoozeUntil);
        if (!updated) return { error: `No se encontró el work item "${id}".` };
        return updated;
      },
    },
  ];
}
