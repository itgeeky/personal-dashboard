"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

const AUTO_RETRY_MAX_ATTEMPTS = 3;
const AUTO_RETRY_DELAY_MS = 1500;

/** PGRST303 (JWT issued at future) is Supabase Auth/PostgREST clock skew — transient and
 * usually gone within a couple seconds, so it's worth a silent auto-retry before bothering the user. */
function isClockSkewError(error: Error & { digest?: string }): boolean {
  return /PGRST303|issued at future/i.test(error.message);
}

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [autoRetrying, setAutoRetrying] = useState(false);
  const attempts = useRef(0);

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    if (!isClockSkewError(error) || attempts.current >= AUTO_RETRY_MAX_ATTEMPTS) return;
    attempts.current += 1;
    setAutoRetrying(true);
    const timer = setTimeout(() => {
      setAutoRetrying(false);
      retry();
    }, AUTO_RETRY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [error, retry]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center ring-1 ring-foreground/5">
        <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-base font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          {autoRetrying
            ? "Reconnecting…"
            : "The page hit an unexpected error while loading your data."}
        </p>
        {error.digest ? (
          <p className="mt-2 text-[11px] text-muted-foreground/70">Ref: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={() => retry()}
          disabled={autoRetrying}
          className="mt-5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none disabled:opacity-60"
        >
          <RefreshCw className={autoRetrying ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  );
}
