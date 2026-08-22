"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, ListChecks, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();

    if (mode === "signup") {
      const { error: signError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setBusy(false);
      if (signError) {
        setError(signError.message);
        return;
      }
      setMessage("Check your email to confirm, or sign in if confirmation is disabled.");
      return;
    }

    const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-surface p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-3">
      <div className="relative mx-auto grid min-h-[calc(100vh-1rem)] max-w-350 overflow-hidden rounded-4xl bg-card ring-1 ring-foreground/5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden overflow-hidden bg-foreground p-12 text-background lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -top-32 -left-20 size-80 rounded-full bg-brand/30 blur-3xl" />
          <div className="absolute right-0 bottom-16 size-64 rounded-full bg-background/10 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-2xl bg-brand text-sm font-bold text-brand-foreground"
            >
              C
            </span>
            <span className="font-semibold tracking-tight" translate="no">
              Work Cockpit
            </span>
          </div>

          <div className="relative max-w-xl">
            <p className="mb-4 text-xs font-semibold tracking-[0.18em] text-background/50 uppercase">
              One calm place for your work
            </p>
            <h1 className="text-5xl leading-[1.06] font-semibold tracking-[-0.04em] text-balance">
              Start the day knowing exactly what needs you.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-background/65">
              Calendar capacity, open work, dependencies, and recommendations—organized around
              what you should do next.
            </p>
          </div>

          <div className="relative grid grid-cols-3 gap-3">
            <Feature icon={CalendarDays} label="Calendar context" />
            <Feature icon={ListChecks} label="Unified work" />
            <Feature icon={Sparkles} label="Next action" />
          </div>
        </div>

        <div className="flex min-h-[calc(100vh-1rem)] flex-col">
          <div className="flex items-center justify-between p-5 lg:justify-end">
            <div className="flex items-center gap-2 lg:hidden">
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-xl bg-brand text-xs font-bold text-brand-foreground"
              >
                C
              </span>
              <span className="text-sm font-semibold" translate="no">
                Work Cockpit
              </span>
            </div>
            <ThemeToggle />
          </div>

          <div className="flex flex-1 items-center justify-center px-6 pb-20">
            <div className="w-full max-w-sm">
              <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Personal workspace
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                {mode === "signin" ? "Welcome back" : "Create your cockpit"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {mode === "signin"
                  ? "Sign in to open your daily command center."
                  : "Create the private account that owns your dashboard data."}
              </p>

              <form className="mt-8 grid gap-4" onSubmit={submit}>
                <label className="grid gap-2 text-sm font-medium">
                  Email
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    spellCheck={false}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 rounded-2xl bg-muted/70 px-4 font-normal ring-1 ring-foreground/8 transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    placeholder="you@example.com"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Password
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    spellCheck={false}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 rounded-2xl bg-muted/70 px-4 font-normal ring-1 ring-foreground/8 transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    placeholder="At least 6 characters"
                  />
                </label>

                <div aria-live="polite" className="grid gap-2 empty:hidden">
                  {error ? (
                    <p
                      role="alert"
                      className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                      {error}
                    </p>
                  ) : null}
                  {message ? (
                    <p className="rounded-2xl bg-brand/15 px-3 py-2 text-sm text-foreground">
                      {message}
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-60"
                >
                  {busy ? "Signing in…" : mode === "signin" ? "Open Cockpit" : "Create Account"}
                  {busy ? null : <ArrowRight className="size-4" aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setError(null);
                    setMessage(null);
                  }}
                  className="h-10 rounded-2xl text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  {mode === "signin"
                    ? "New here? Create an account"
                    : "Already have an account? Sign in"}
                </button>
              </form>

              <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
                Your source systems remain canonical. The cockpit only stores the context needed
                to organize your day.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Feature({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-background/8 p-3 ring-1 ring-background/10">
      <Icon className="size-4 text-brand" aria-hidden="true" />
      <p className="mt-3 text-xs font-medium text-background/75">{label}</p>
    </div>
  );
}
