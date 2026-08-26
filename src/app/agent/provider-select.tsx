"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronsUpDown, Route, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AgentProviderId } from "@/domain/agent/api";
import { cn } from "@/lib/utils";

type ProviderOption = {
  id: AgentProviderId;
  label: string;
  detail: string;
  icon: LucideIcon;
};

const providerOptions: ProviderOption[] = [
  {
    id: "gemini",
    label: "Gemini",
    detail: "Google · rápido para el día a día",
    icon: Sparkles,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    detail: "Enruta la consulta a otros modelos",
    icon: Route,
  },
];

const optionById = new Map(providerOptions.map((option) => [option.id, option]));

export function ProviderSelect({
  value,
  onChange,
  busy = false,
}: {
  value: AgentProviderId;
  onChange: (next: AgentProviderId) => void;
  busy?: boolean;
}) {
  const active = optionById.get(value) ?? providerOptions[0];
  const ActiveIcon = active.icon;

  return (
    <Select.Root
      value={value}
      disabled={busy}
      onValueChange={(next) => onChange(next as AgentProviderId)}
    >
      <Select.Trigger
        aria-label="Modelo del agente"
        className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 py-1 pr-1.5 pl-2 text-[11px] font-medium text-brand-foreground ring-1 ring-brand/20 transition-colors outline-none select-none hover:bg-brand/25 focus-visible:ring-2 focus-visible:ring-brand-foreground/40 data-disabled:opacity-70 data-popup-open:bg-brand/25"
      >
        <ActiveIcon
          aria-hidden="true"
          className={cn("size-3.5", busy && "animate-pulse motion-reduce:animate-none")}
        />
        {active.label}
        {busy ? <span className="text-brand-foreground/70">· pensando…</span> : null}
        <Select.Icon
          render={<ChevronsUpDown aria-hidden="true" className="size-3 text-brand-foreground/60" />}
        />
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner
          side="top"
          align="start"
          sideOffset={8}
          alignItemWithTrigger={false}
          className="isolate z-50 outline-none"
        >
          <Select.Popup className="w-72 origin-(--transform-origin) rounded-2xl bg-popover p-1.5 text-popover-foreground shadow-[0_24px_60px_-30px_rgba(0,0,0,0.45)] ring-1 ring-foreground/10 transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0">
            <Select.List>
              {providerOptions.map((option) => (
                <Select.Item
                  key={option.id}
                  value={option.id}
                  className="group/item flex cursor-default items-center gap-2.5 rounded-xl px-2 py-2 text-left outline-none select-none data-highlighted:bg-muted"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground ring-1 ring-foreground/5 group-data-selected/item:bg-brand/20 group-data-selected/item:text-brand-foreground"
                  >
                    <option.icon className="size-4" />
                  </span>
                  <Select.ItemText className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-xs leading-5 text-muted-foreground">
                      {option.detail}
                    </span>
                  </Select.ItemText>
                  <Select.ItemIndicator
                    render={
                      <span className="flex size-4 shrink-0 items-center justify-center text-brand-foreground" />
                    }
                  >
                    <Check className="size-4" aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
            <p className="mt-1 border-t border-foreground/6 px-2 pt-2 pb-1 text-[11px] leading-4 text-muted-foreground">
              Cambiar de modelo reinicia el contexto: el agente deja de recordar los mensajes
              anteriores.
            </p>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
