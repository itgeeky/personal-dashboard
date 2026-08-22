import Link from "next/link";
import { Panel } from "@/components/panel";

/** Placeholder for routes whose slice is intentionally not built yet. */
export function StubPanel({
  slice,
  title,
  summary,
  planned,
}: {
  slice: string;
  title: string;
  summary: string;
  planned: string[];
}) {
  return (
    <Panel className="max-w-2xl">
      <span className="inline-flex rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-foreground">
        {slice}
      </span>
      <h2 className="mt-3 text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{summary}</p>

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Planned for this screen
      </p>
      <ul className="mt-2 grid gap-1.5">
        {planned.map((line) => (
          <li key={line} className="flex gap-2 text-sm">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/30" />
            {line}
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="mt-5 inline-flex h-9 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background"
      >
        Back to dashboard
      </Link>
    </Panel>
  );
}
