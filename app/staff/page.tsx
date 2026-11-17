import { redirect } from "next/navigation";
import { getStaff, serverClient } from "@/lib/supabase/server";
import { StaffBoard } from "@/components/staff/StaffBoard";
import type { Restaurant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const staff = await getStaff();
  if (!staff) redirect("/login");
  const sb = await serverClient();
  const { data: restaurant } = await sb.from("restaurants").select("*").eq("id", staff.restaurantId).single();
  return <StaffBoard restaurant={restaurant as Restaurant} role={staff.role} />;
}
