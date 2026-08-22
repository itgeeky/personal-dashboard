"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HelpCircle, LogOut, Settings } from "lucide-react";
import { isActivePath, navItems } from "@/components/nav-items";
import { ThemeToggle } from "@/components/theme-toggle";
import { displayName, initials } from "@/lib/display";
import { createClient } from "@/lib/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();

  function closeMobileSidebar() {
    if (isMobile) setOpenMobile(false);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" onClick={closeMobileSidebar} />}
              tooltip="Cockpit"
            >
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-foreground"
              >
                C
              </span>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold" translate="no">Cockpit</span>
                <span className="truncate text-xs text-muted-foreground">Work control</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} onClick={closeMobileSidebar} />}
                      isActive={active}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {item.slice ? <SidebarMenuBadge>Soon</SidebarMenuBadge> : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings" onClick={closeMobileSidebar} />}
              isActive={isActivePath(pathname, "/settings")}
              tooltip="Settings"
            >
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/help" onClick={closeMobileSidebar} />}
              isActive={isActivePath(pathname, "/help")}
              tooltip="Help"
            >
              <HelpCircle />
              <span>Help & guide</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sign out">
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator />

        <div className="flex items-center gap-2 overflow-hidden px-2 py-1 group-data-[collapsible=icon]:justify-center">
          <span
            title={email ?? undefined}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-semibold text-brand-foreground"
          >
            <span className="sr-only">Signed in as {email ?? "your account"}</span>
            <span aria-hidden="true">{initials(displayName(email))}</span>
          </span>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-medium">{displayName(email)}</span>
            {email ? (
              <span className="truncate text-xs text-muted-foreground">{email}</span>
            ) : null}
          </div>
          <ThemeToggle className="size-8 shrink-0 rounded-lg group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
