import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskSource, WorkItemStatus } from "@/domain/enums";
import type { ToolDefinition } from "@/domain/agent/types";
import { endOfLocalDay, startOfLocalDay } from "@/domain/calendar";
import { userTimeZone } from "@/lib/env";
import { agendaForDay, agendaForRange, listCalendarEvents } from "@/server/services/calendar";
import { buildDashboard } from "@/server/services/dashboard";
import { listWorkItems } from "@/server/services/tasks";

const MS_DAY = 24 * 60 * 60 * 1000;

/**
 * Agent tools read synced cockpit data (Supabase). Live connector calls stay in
 * Settings sync flows; the agent works on the normalized snapshot already stored.
 */
export function createAgentTools(supabase: SupabaseClient, userId: string): ToolDefinition[] {
  return [
    {
      name: "get_dashboard_snapshot",
      description:
        "Obtiene el snapshot del cockpit: atención inmediata, pendientes, waiting for, agenda de hoy y recomendación priorizada.",
      parameters: { type: "object", properties: {} },
      execute: async () => buildDashboard(supabase, userId),
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
        const timeZone = userTimeZone();
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
          return { timezone: timeZone, ...agendaForDay(events, now, timeZone) };
        }

        return agendaForRange(events, rangeStart, rangeEnd, timeZone);
      },
    },
  ];
}
