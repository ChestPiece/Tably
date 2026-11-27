"use client";
import { ChartNoAxesColumn, LayoutGrid, Settings, Table2, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { SidebarBrand, SidebarUserMenu } from "@/components/ops/SidebarChrome";
import { useOwnerActions } from "@/components/admin/AdminSidebar";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuBadge,
  SidebarMenuButton, SidebarMenuItem, SidebarRail, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { useLang, type Key } from "@/lib/i18n";
import type { StaffRole } from "@/lib/types";
import { cn } from "@/lib/utils";

export const STAFF_TABS = ["board", "today", "tables", "menu"] as const;
export type StaffTab = (typeof STAFF_TABS)[number];

const ROLE_LABEL: Record<StaffRole, Key> = { owner: "roleOwner", staff: "roleStaff" };
const ACTIVE = "h-12 group-data-[collapsible=icon]:size-12! group-data-[collapsible=icon]:p-4! data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground";

type SidebarProps = {
  venue: string;
  tab: StaffTab;
  onTab: (t: StaffTab) => void;
  counts: { board: number; tables: number; soldOut: number };
  role: StaffRole;
  me: string;
};

export function StaffSidebar({ venue, tab, onTab, counts, role, me }: SidebarProps) {
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
      <SidebarBrand venue={venue} role={t(ROLE_LABEL[role])} />
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
        <SidebarUserMenu name={me} role={t(ROLE_LABEL[role])} actions={actions} tall />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

type BarProps = { title: string; online: boolean; shift: boolean; onToggleShift: () => void };

/** Thin top bar: sidebar toggle (phones only; desktop has it in the sidebar header), page title, connection and shift switch. */
export function StaffTopBar({ title, online, shift, onToggleShift }: BarProps) {
  const { t } = useLang();
  return (
    <header className="z-20 flex h-15 shrink-0 items-center gap-3 border-b bg-card px-3 short:h-12">
      <SidebarTrigger className="size-10 text-muted-foreground lg:hidden" />
      <h1 className="min-w-0 truncate text-lg font-semibold">{title}</h1>
      <div className="ms-auto flex shrink-0 items-center gap-5 max-[600px]:gap-3">
        {/* A chip, not a lone dot: reconnecting must be noticed (new orders may be missing until it recovers). */}
        <span
          role="status"
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-full px-3 text-sm font-medium whitespace-nowrap ring-1 ring-border max-[600px]:px-2.5",
            online ? "text-text-2" : "bg-[color-mix(in_oklch,var(--ochre)_14%,transparent)] text-ochre-text ring-ochre",
          )}
        >
          <i aria-hidden className={cn("size-2 rounded-full", online ? "bg-status-ready" : "bg-ochre motion-safe:animate-pulse")} />
          <span className="max-[600px]:sr-only">{t(online ? "connLive" : "connReconnecting")}</span>
        </span>
        <span title={t("shiftHint")}>
          <Switch checked={shift} onCheckedChange={onToggleShift} label={<span className="max-[600px]:sr-only">{t("shiftOn")}</span>} />
        </span>
      </div>
    </header>
  );
}
