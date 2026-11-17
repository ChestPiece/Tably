"use client";
import Link from "next/link";
import { Languages, LogOut, MoreHorizontal, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLang } from "@/lib/i18n";
import type { Can, StaffRole } from "@/lib/types";
import { cn } from "@/lib/utils";

export type StaffTab = "board" | "tables" | "menu";

type Props = {
  venue: string;
  tab: StaffTab;
  onTab: (t: StaffTab) => void;
  counts: { board: number; tables: number; soldOut: number };
  online: boolean;
  shift: boolean;
  onToggleShift: () => void;
  role: StaffRole;
  can: Can;
  onSignOut: () => void;
};

export function StaffHeader({ venue, tab, onTab, counts, online, shift, onToggleShift, role, can, onSignOut }: Props) {
  const { t, toggle } = useLang();
  const { resolvedTheme, setTheme } = useTheme();
  const tabs = ([
    ["board", t("tabBoard"), counts.board, true],
    ["tables", t("tabTables"), counts.tables, can.tables],
    ["menu", t("tabMenu"), counts.soldOut, can.soldOut],
  ] as const).filter((x) => x[3]);
  return (
    <header className="z-20 flex h-15 shrink-0 items-center gap-6 border-b bg-card px-5 max-[900px]:gap-3 max-[900px]:px-3">
      <h1 className="flex shrink-0 items-center gap-2 font-semibold whitespace-nowrap">
        <BrandMark className="size-[22px] text-primary" />
        <span className="max-[900px]:sr-only">{venue}</span>
      </h1>
      <Tabs value={tab} onValueChange={(v) => onTab(v as StaffTab)} className="h-full min-w-0 overflow-x-auto [scrollbar-width:none]">
        <TabsList variant="underline" aria-label={t("boardSections")} className="h-full">
          {tabs.map(([k, label, n]) => (
            <TabsTrigger key={k} value={k} className="h-full gap-2 px-4 max-[900px]:px-2.5">
              {label}
              <span className="text-sm font-medium text-muted-foreground tabular-nums">{n}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="ms-auto flex shrink-0 items-center gap-5 max-[900px]:gap-2">
        <span role="status" className="inline-flex items-center gap-2 text-sm whitespace-nowrap text-text-2">
          <i aria-hidden className={cn("size-2 rounded-full", online ? "bg-status-ready" : "bg-ochre")} />
          <span className="max-[900px]:sr-only">{t(online ? "connLive" : "connReconnecting")}</span>
        </span>
        <span title={t("shiftHint")}>
          <Switch checked={shift} onCheckedChange={onToggleShift} label={<span className="max-[600px]:sr-only">{t("shiftOn")}</span>} />
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("moreOptions")}>
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuItem className="min-h-11" onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              <Sun aria-hidden className="hidden dark:block" />
              <Moon aria-hidden className="dark:hidden" />
              {t("themeLabel")}
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" onSelect={toggle}>
              <Languages aria-hidden />
              {t("switchLang")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {role === "owner" && (
              <DropdownMenuItem asChild className="min-h-11">
                <Link href="/admin">
                  <Settings aria-hidden />
                  {t("adminLink")}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="min-h-11" onSelect={onSignOut}>
              <LogOut aria-hidden />
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
