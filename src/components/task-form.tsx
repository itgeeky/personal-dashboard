"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { workItemPriorities, workItemStatuses } from "@/domain/enums";
import type { WorkItemWithOverlay } from "@/domain/types";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
import { cn } from "@/lib/utils";

const empty = {
  title: "",
  description: "",
  priority: "none",
  status: "open",
  dueAt: "",
  estimatedMinutes: "",
  tags: "",
  relatedPerson: "",
  relatedProject: "",
  notes: "",
  reminderAt: "",
  waitingForPerson: "",
  waitingForExpected: "",
  nextAction: "",
};

export function TaskForm({
  item,
  onSaved,
  triggerLabel = "Add task",
  triggerClassName,
}: {
  item?: WorkItemWithOverlay | null;
  onSaved: () => void;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function hydrate(next: WorkItemWithOverlay | null | undefined) {
    if (!next) {
      setForm(empty);
      return;
    }
    setForm({
      title: next.title,
      description: next.description ?? "",
      priority: next.priority,
      status: next.status,
      dueAt: toDateTimeLocal(next.dueAt),
      estimatedMinutes: next.estimatedMinutes ? String(next.estimatedMinutes) : "",
      tags: next.tags.join(", "),
      relatedPerson: next.relatedPerson ?? "",
      relatedProject: next.relatedProject ?? "",
      notes: next.overlay?.notes ?? "",
      reminderAt: toDateTimeLocal(next.overlay?.reminderAt),
      waitingForPerson: next.overlay?.waitingForPerson ?? "",
      waitingForExpected: next.overlay?.waitingForExpected ?? "",
      nextAction: next.overlay?.nextAction ?? "",
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      status: form.status,
      dueAt: fromDateTimeLocal(form.dueAt),
      estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : null,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      relatedPerson: form.relatedPerson || null,
      relatedProject: form.relatedProject || null,
      notes: form.notes || null,
      reminderAt: fromDateTimeLocal(form.reminderAt),
      waitingForPerson: form.waitingForPerson || null,
      waitingForExpected: form.waitingForExpected || null,
      nextAction: form.nextAction || null,
    };

    const url = item ? `/api/tasks/${item.id}` : "/api/tasks";
    const response = await fetch(url, {
      method: item ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!response.ok) {
      setError("Could not save the task.");
      return;
    }
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) hydrate(item);
      }}
    >
      <DialogTrigger
        aria-label={item ? triggerLabel : undefined}
        title={item ? triggerLabel : undefined}
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none",
          item
            ? "size-7 text-muted-foreground hover:bg-muted hover:text-foreground"
            : "h-9 bg-brand px-4 text-brand-foreground hover:brightness-95",
          triggerClassName,
        )}
      >
        {item ? (
          <Pencil className="size-3.5" aria-hidden="true" />
        ) : (
          <>
            <Plus className="size-4" aria-hidden="true" />
            {triggerLabel}
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Edit task" : "New manual task"}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={submit}>
          <Field label="Title">
            <Input
              required
              name="title"
              autoComplete="off"
              placeholder="e.g. Send Q3 report…"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <select
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {workItemPriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {workItemStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due">
              <Input
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
              />
            </Field>
            <Field label="Estimate (minutes)">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="e.g. 45"
                value={form.estimatedMinutes}
                onChange={(e) => setForm({ ...form, estimatedMinutes: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Tags">
            <Input
              autoComplete="off"
              placeholder="Comma separated, e.g. billing, urgent…"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Related person">
              <Input
                value={form.relatedPerson}
                onChange={(e) => setForm({ ...form, relatedPerson: e.target.value })}
              />
            </Field>
            <Field label="Project">
              <Input
                value={form.relatedProject}
                onChange={(e) => setForm({ ...form, relatedProject: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Next action">
            <Input
              value={form.nextAction}
              onChange={(e) => setForm({ ...form, nextAction: e.target.value })}
            />
          </Field>
          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <Field label="Reminder">
            <Input
              type="datetime-local"
              value={form.reminderAt}
              onChange={(e) => setForm({ ...form, reminderAt: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Waiting for (person)">
              <Input
                value={form.waitingForPerson}
                onChange={(e) => setForm({ ...form, waitingForPerson: e.target.value })}
              />
            </Field>
            <Field label="Waiting for (what)">
              <Input
                value={form.waitingForExpected}
                onChange={(e) => setForm({ ...form, waitingForExpected: e.target.value })}
              />
            </Field>
          </div>
          <div aria-live="polite">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : item ? "Save Task" : "Create Task"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-sm leading-none font-medium">{label}</span>
      {children}
    </label>
  );
}
