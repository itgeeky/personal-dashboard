"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      title="Toggle color theme"
      aria-label="Toggle color theme"
      className={cn(
        "flex size-10 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none",
        className,
      )}
    >
      <Sun className="size-4.5 dark:hidden" aria-hidden="true" />
      <Moon className="hidden size-4.5 dark:block" aria-hidden="true" />
    </button>
  );
}
