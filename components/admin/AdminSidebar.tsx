"use client";
import Link from "next/link";
import { ChefHat, House, Languages, ListOrdered, LogOut, MonitorPlay, Moon, QrCode, Settings, Sun, TrendingUp, UsersRound, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useTheme } from "next-themes";
import { BrandMark } from "@/components/brand";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuBadge,
  SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";
import { useLang, type Key } from "@/lib/i18n";
import { staffClient } from "@/lib/supabase/browser";

export type OwnerPage = "home" | "board" | "orders" | "profit" | "menu" | "tables" | "team" | "settings";

export const OWNER_PAGES: { id: OwnerPage; label: Key; icon: LucideIcon; group: "main" | "venue" }[] = [
  { id: "home", label: "navHome", icon: House, group: "main" },
  { id: "board", label: "navBoard", icon: MonitorPlay, group: "main" },
  { id: "orders", label: "navOrders", icon: ListOrdered, group: "main" },
  { id: "profit", label: "navProfit", icon: TrendingUp, group: "main" },
  { id: "menu", label: "menu", icon: UtensilsCrossed, group: "venue" },
  { id: "tables", label: "navTables", icon: QrCode, group: "venue" },
  { id: "team", label: "navTeam", icon: UsersRound, group: "venue" },
  { id: "settings", label: "navSettings", icon: Settings, group: "venue" },
];

export type OwnerAction = { id: string; label: string; icon: ReactNode; href?: string; lang?: string; onClick?: () => void };

/** Kitchen link, theme, language, sign out: shared by the sidebar footer and the phone "More" sheet. */
export function useOwnerActions(): OwnerAction[] {
  const { lang, t, toggle } = useLang();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  return [
    { id: "kitchen", label: t("openKitchen"), icon: <ChefHat aria-hidden />, href: "/staff" },
    {
      id: "theme",
      label: t("themeLabel"),
      icon: (
        <>
          <Sun aria-hidden className="hidden dark:block" />
          <Moon aria-hidden className="dark:hidden" />
        </>
      ),
      onClick: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    },
    { id: "lang", label: t("switchLang"), icon: <Languages aria-hidden />, lang: lang === "ar" ? "en" : "ar", onClick: toggle },
    {
      id: "signout",
      label: t("signOut"),
      icon: <LogOut aria-hidden />,
      onClick: async () => {
        await staffClient().auth.signOut();
        router.replace("/login");
        router.refresh();
      },
    },
  ];
}

// Active page = filled indigo pill.
const ACTIVE = "h-10 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground";

type Props = { page: OwnerPage; onPage: (p: OwnerPage) => void; venue: string; me: string; liveCount: number };

export function AdminSidebar({ page, onPage, venue, me, liveCount }: Props) {
  const { t } = useLang();
  const { setOpenMobile } = useSidebar();
  const actions = useOwnerActions();
  const item = ({ id, label, icon: Icon }: (typeof OWNER_PAGES)[number]) => (
    <SidebarMenuItem key={id}>
      <SidebarMenuButton
        isActive={page === id}
        className={ACTIVE}
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
      {id === "board" && liveCount > 0 && <SidebarMenuBadge className="top-2.5 text-muted-foreground tabular-nums peer-data-[active=true]/menu-button:text-primary-foreground">{liveCount}</SidebarMenuBadge>}
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
          {actions.map((a) => (
            <SidebarMenuItem key={a.id}>
              {a.href ? (
                <SidebarMenuButton asChild tooltip={a.label}>
                  <Link href={a.href}>
                    {a.icon}
                    <span>{a.label}</span>
                  </Link>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton tooltip={a.label} lang={a.lang} onClick={a.onClick}>
                  {a.icon}
                  <span>{a.label}</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
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
