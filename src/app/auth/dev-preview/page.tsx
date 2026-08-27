"use client";

import { useEffect, useState } from "react";
import { DateTimePicker } from "@/components/ui/datetime-picker";

export default function DevPreviewPage() {
  const [due, setDue] = useState("");
  const [reminder, setReminder] = useState("");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <button
        type="button"
        className="w-fit rounded border px-2 py-1 text-sm"
        onClick={() => setDark((d) => !d)}
      >
        Toggle dark mode
      </button>
      <div className="grid gap-1.5 text-sm">
        <span className="font-medium">Due</span>
        <DateTimePicker value={due} onChange={setDue} />
        <span data-testid="due-value">{due || "(empty)"}</span>
      </div>
      <div className="grid gap-1.5 text-sm">
        <span className="font-medium">Reminder</span>
        <DateTimePicker value={reminder} onChange={setReminder} />
        <span data-testid="reminder-value">{reminder || "(empty)"}</span>
      </div>
    </div>
  );
}
