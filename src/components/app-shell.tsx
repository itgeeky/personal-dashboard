"use client";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function AppShell({
  email,
  children,
}: {
  email?: string | null;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-50 focus-visible:rounded-full focus-visible:bg-card focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:ring-2 focus-visible:ring-foreground/30"
      >
        Skip to content
      </a>
      <AppSidebar email={email} />
      <SidebarInset className="min-w-0 overflow-x-hidden bg-surface">
        <div className="px-2 pt-2 sm:px-3">
          <SidebarTrigger />
        </div>
        <main
          id="main"
          className="@container mx-auto min-w-0 w-full max-w-350 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-3 sm:pt-0"
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
