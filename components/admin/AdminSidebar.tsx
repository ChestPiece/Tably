"use client";
import Link from "next/link";
import { ChefHat, House, Languages, ListOrdered, LogOut, MonitorPlay, Moon, QrCode, Settings, Sun, UsersRound, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { BrandMark } from "@/components/brand";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuBadge,
  SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";
import { useLang, type Key } from "@/lib/i18n";
import { staffClient } from "@/lib/supabase/browser";

export type OwnerPage = "home" | "board" | "orders" | "menu" | "tables" | "team" | "settings";

export const OWNER_PAGES: { id: OwnerPage; label: Key; icon: LucideIcon; group: "main" | "venue" }[] = [
  { id: "home", label: "navHome", icon: House, group: "main" },
  { id: "board", label: "navBoard", icon: MonitorPlay, group: "main" },
  { id: "orders", label: "navOrders", icon: ListOrdered, group: "main" },
  { id: "menu", label: "menu", icon: UtensilsCrossed, group: "venue" },
  { id: "tables", label: "navTables", icon: QrCode, group: "venue" },
  { id: "team", label: "navTeam", icon: UsersRound, group: "venue" },
  { id: "settings", label: "navSettings", icon: Settings, group: "venue" },
];

type Props = { page: OwnerPage; onPage: (p: OwnerPage) => void; venue: string; me: string; liveCount: number };

export function AdminSidebar({ page, onPage, venue, me, liveCount }: Props) {
  const { lang, t, toggle } = useLang();
  const { resolvedTheme, setTheme } = useTheme();
  const { setOpenMobile } = useSidebar();
  const router = useRouter();
  const item = ({ id, label, icon: Icon }: (typeof OWNER_PAGES)[number]) => (
    <SidebarMenuItem key={id}>
      <SidebarMenuButton
        isActive={page === id}
        tooltip={t(label)}
        aria-current={page === id ? "page" : undefined}
        onClick={() => {
          onPage(id);
          setOpenMobile(false);
        }}
      >
        <Icon aria-hidden />
        <span>{t(label)}</span>
      </SidebarMenuButton>
      {id === "board" && liveCount > 0 && <SidebarMenuBadge className="text-muted-foreground tabular-nums">{liveCount}</SidebarMenuBadge>}
    </SidebarMenuItem>
  );
  return (
    <Sidebar collapsible="icon" aria-label={t("adminSections")}>
      <SidebarHeader className="px-3 pt-4 pb-5">
        <div className="flex items-center gap-3 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <BrandMark className="size-7 text-primary" />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <b className="block truncate font-semibold">{venue}</b>
            <small className="text-sm text-muted-foreground">{t("roleOwner")}</small>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="py-0">
          <SidebarGroupContent>
            <SidebarMenu>{OWNER_PAGES.filter((p) => p.group === "main").map(item)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navVenue")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{OWNER_PAGES.filter((p) => p.group === "venue").map(item)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t("openKitchen")}>
              <Link href="/staff">
                <ChefHat aria-hidden />
                <span>{t("openKitchen")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={t("themeLabel")} aria-label={t("themeToggle")} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              <Sun aria-hidden className="hidden dark:block" />
              <Moon aria-hidden className="dark:hidden" />
              <span>{t("themeLabel")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={t("switchLang")} lang={lang === "ar" ? "en" : "ar"} onClick={toggle}>
              <Languages aria-hidden />
              <span>{t("switchLang")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t("signOut")}
              onClick={async () => {
                await staffClient().auth.signOut();
                router.replace("/login");
                router.refresh();
              }}
            >
              <LogOut aria-hidden />
              <span>{t("signOut")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-3 px-2 pt-2 group-data-[collapsible=icon]:hidden">
          <i aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold not-italic">
            {me.trim().charAt(0).toUpperCase() || "?"}
          </i>
          <div className="min-w-0 text-sm">
            <span className="block truncate">{me}</span>
            <small className="text-muted-foreground">{t("roleOwner")}</small>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
