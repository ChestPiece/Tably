"use client";
import Link from "next/link";
import { ChartNoAxesColumn, LayoutGrid, Settings, Table2, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { useOwnerActions } from "@/components/admin/AdminSidebar";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuBadge,
  SidebarMenuButton, SidebarMenuItem, SidebarRail, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { useLang, type Key } from "@/lib/i18n";
import type { StaffRole } from "@/lib/types";
import { cn } from "@/lib/utils";

export type StaffTab = "board" | "today" | "tables" | "menu";

const ROLE_LABEL: Record<StaffRole, Key> = { owner: "roleOwner", staff: "roleStaff" };
const ACTIVE = "h-12 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground";

type SidebarProps = {
  venue: string;
  tab: StaffTab;
  onTab: (t: StaffTab) => void;
  counts: { board: number; tables: number; soldOut: number };
  role: StaffRole;
};

export function StaffSidebar({ venue, tab, onTab, counts, role }: SidebarProps) {
  const { t } = useLang();
  const { setOpenMobile } = useSidebar();
  // Same footer as the owner sidebar, minus the link back to this board; owners get Admin instead.
  const actions = useOwnerActions().filter((a) => a.id !== "kitchen");
  if (role === "owner") actions.unshift({ id: "admin", label: t("adminLink"), icon: <Settings aria-hidden />, href: "/admin" });
  const tabs: [StaffTab, Key, LucideIcon, number][] = [
    ["board", "tabBoard", LayoutGrid, counts.board],
    ["today", "today", ChartNoAxesColumn, 0],
    ["tables", "tabTables", Table2, counts.tables],
    ["menu", "tabMenu", UtensilsCrossed, counts.soldOut],
  ];
  return (
    <Sidebar collapsible="icon" aria-label={t("boardSections")}>
      <SidebarHeader className="px-3 pt-4 pb-5">
        <div className="flex items-center gap-3 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <BrandMark className="size-7 shrink-0 text-primary" />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <b className="block truncate font-semibold">{venue}</b>
            <small className="text-sm text-muted-foreground">{t(ROLE_LABEL[role])}</small>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="py-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {tabs.map(([id, label, Icon, n]) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      isActive={tab === id}
                      className={ACTIVE}
                      tooltip={t(label)}
                      aria-current={tab === id ? "page" : undefined}
                      onClick={() => {
                        onTab(id);
                        setOpenMobile(false);
                      }}
                    >
                      <Icon aria-hidden />
                      <span>{t(label)}</span>
                    </SidebarMenuButton>
                    {/* Zero is noise: "Menu 0" read as "no dishes". */}
                    {n > 0 && <SidebarMenuBadge className="top-3.5 text-muted-foreground tabular-nums peer-data-[active=true]/menu-button:text-primary-foreground">{n}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          {actions.map((a) => (
            <SidebarMenuItem key={a.id}>
              {a.href ? (
                <SidebarMenuButton asChild tooltip={a.label} className="h-11">
                  <Link href={a.href}>
                    {a.icon}
                    <span>{a.label}</span>
                  </Link>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton tooltip={a.label} lang={a.lang} onClick={a.onClick} className="h-11">
                  {a.icon}
                  <span>{a.label}</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

type BarProps = { title: string; online: boolean; shift: boolean; onToggleShift: () => void };

/** Thin top bar: sidebar toggle, page title, connection and shift switch. */
export function StaffTopBar({ title, online, shift, onToggleShift }: BarProps) {
  const { t } = useLang();
  return (
    <header className="z-20 flex h-15 shrink-0 items-center gap-3 border-b bg-card px-3">
      <SidebarTrigger className="size-10 text-muted-foreground" />
      <h1 className="truncate text-lg font-semibold">{title}</h1>
      <div className="ms-auto flex shrink-0 items-center gap-5 max-[600px]:gap-3">
        <span role="status" className="inline-flex items-center gap-2 text-sm whitespace-nowrap text-text-2">
          <i aria-hidden className={cn("size-2 rounded-full", online ? "bg-status-ready" : "bg-ochre")} />
          <span className="max-[600px]:sr-only">{t(online ? "connLive" : "connReconnecting")}</span>
        </span>
        <span title={t("shiftHint")}>
          <Switch checked={shift} onCheckedChange={onToggleShift} label={<span className="max-[600px]:sr-only">{t("shiftOn")}</span>} />
        </span>
      </div>
    </header>
  );
}
