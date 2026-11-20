import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getStaff, serverClient } from "@/lib/supabase/server";
import { StaffBoard } from "@/components/staff/StaffBoard";
import type { Restaurant } from "@/lib/types";
import { VenueProvider } from "@/lib/venue";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const staff = await getStaff();
  if (!staff) redirect("/login");
  const sb = await serverClient();
  const [{ data: restaurant }, { count: open }] = await Promise.all([
    sb.from("restaurants").select("*").eq("id", staff.restaurantId).single(),
    sb.from("shifts").select("id", { count: "exact", head: true }).eq("user_id", staff.userId).is("ended_at", null),
  ]);
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return (
    <VenueProvider restaurant={restaurant as Restaurant}>
      <StaffBoard restaurant={restaurant as Restaurant} role={staff.role} clockedIn={!!open} sidebarOpen={sidebarOpen} />
    </VenueProvider>
  );
}
