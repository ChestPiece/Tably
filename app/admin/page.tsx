import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getStaff, serverClient } from "@/lib/supabase/server";
import { AdminApp } from "@/components/admin/AdminApp";
import { VenueProvider } from "@/lib/venue";
import { dayRange } from "@/lib/stats";
import { MENU_SELECT, ORDER_SELECT, type Category, type MenuItem, type Order, type Restaurant, type TableRow, type Visit } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/setup"); // signed out goes on to /login from there
  if (staff.role !== "owner") redirect("/staff");
  const sb = await serverClient();
  const rid = staff.restaurantId;
  // "Today" is the venue's day in its own time zone, not the server's.
  const now = new Date();
  const today = dayRange(now, staff.timezone);
  const lastWeek = dayRange(new Date(now.getTime() - 7 * 864e5), staff.timezone);
  const [r, c, m, t, team, invites, orders, prev, open, paid] = await Promise.all([
    sb.from("restaurants").select("*").eq("id", rid).single(),
    sb.from("categories").select("*").eq("restaurant_id", rid).order("position"),
    sb.from("menu_items").select(MENU_SELECT).eq("restaurant_id", rid).order("position").order("position", { referencedTable: "item_options" }),
    sb.from("tables").select("*").eq("restaurant_id", rid).order("number"),
    sb.from("staff_members").select("user_id, role, display_name").eq("restaurant_id", rid),
    sb.from("staff_invites").select("email, role").eq("restaurant_id", rid),
    sb.from("orders").select(ORDER_SELECT).eq("restaurant_id", rid).gte("created_at", today.start).lt("created_at", today.end).order("created_at", { ascending: false }),
    sb.from("orders").select("created_at, status").eq("restaurant_id", rid).gte("created_at", lastWeek.start).lt("created_at", lastWeek.end),
    sb.from("visits").select("*").eq("restaurant_id", rid).is("closed_at", null),
    sb.from("visits").select("*").eq("restaurant_id", rid).gte("paid_at", today.start).lt("paid_at", today.end),
  ]);
  return (
    <VenueProvider restaurant={r.data as Restaurant}>
    <AdminApp
      me={staff.userId}
      email={staff.email}
      sidebarOpen={(await cookies()).get("sidebar_state")?.value !== "false"}
      restaurant={r.data as Restaurant}
      categories={(c.data ?? []) as Category[]}
      menu={(m.data ?? []) as MenuItem[]}
      tables={(t.data ?? []) as TableRow[]}
      team={team.data ?? []}
      invites={invites.data ?? []}
      today={{
        orders: (orders.data ?? []) as Order[],
        lastWeek: (prev.data ?? []) as Order[],
        openVisits: (open.data ?? []) as Visit[],
        paidVisits: (paid.data ?? []) as Visit[],
      }}
    />
    </VenueProvider>
  );
}
