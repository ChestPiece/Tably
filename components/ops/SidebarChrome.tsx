"use client";
import Link from "next/link";
import { ChevronsUpDown, PanelLeft } from "lucide-react";
import type { OwnerAction } from "@/components/admin/AdminSidebar";
import { BrandMark } from "@/components/brand";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useLang } from "@/lib/i18n";

/** Venue mark + name with the collapse button beside it. Collapsed: the mark itself expands the sidebar. */
export function SidebarBrand({ venue, role }: { venue: string; role: string }) {
  const { t } = useLang();
  const { toggleSidebar } = useSidebar();
  return (
    <SidebarHeader className="px-3 pt-3 pb-4">
      <div className="flex h-10 items-center gap-3 ps-1 group-data-[collapsible=icon]:hidden">
        <BrandMark className="size-7 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 leading-tight">
          <b className="block truncate font-semibold">{venue}</b>
          <small className="text-xs text-muted-foreground">{role}</small>
        </div>
        <SidebarTrigger className="size-8 shrink-0 text-muted-foreground max-lg:hidden" />
      </div>
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={t("toggleSidebar")}
        className="group/brand mx-auto hidden size-10 place-items-center rounded-md text-primary outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:grid"
      >
        <BrandMark className="size-7 group-hover/brand:hidden group-focus-visible/brand:hidden" />
        <PanelLeft aria-hidden className="hidden size-4 text-muted-foreground group-hover/brand:block group-focus-visible/brand:block rtl:-scale-x-100" />
      </button>
    </SidebarHeader>
  );
}

/** One user row; theme, language, links and sign out live in its menu. */
export function SidebarUserMenu({ name, role, actions, tall }: { name: string; role: string; actions: OwnerAction[]; tall?: boolean }) {
  const { isMobile } = useSidebar();
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const last = actions.length - 1;
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" tooltip={name} className={tall ? "h-12" : undefined}>
              <i aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold text-foreground not-italic">
                {initial}
              </i>
              <span className="min-w-0 flex-1 text-start leading-tight">
                <span className="block truncate text-sm font-medium">{name}</span>
                <small className="block text-xs text-muted-foreground">{role}</small>
              </span>
              <ChevronsUpDown aria-hidden className="ms-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" className="min-w-56">
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {actions.map((a, i) => (
              <div key={a.id}>
                {i === last && <DropdownMenuSeparator />}
                {a.href ? (
                  <DropdownMenuItem asChild className={tall ? "h-11" : undefined}>
                    <Link href={a.href}>
                      {a.icon}
                      {a.label}
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem lang={a.lang} onSelect={a.onClick} className={tall ? "h-11" : undefined}>
                    {a.icon}
                    {a.label}
                  </DropdownMenuItem>
                )}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
