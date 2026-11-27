import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { GuestApp } from "@/components/guest/GuestApp";
import { VenueProvider } from "@/lib/venue";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { MENU_SELECT, type Category, type MenuItem, type Restaurant } from "@/lib/types";

export const dynamic = "force-dynamic";

// Public guest entry: /t/<random table slug>. Menu data is public; visit data loads client-side.
export default async function TablePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data: info } = await sb.rpc("table_info", { p_slug: slug });
  if (!info) notFound();
  const rid = info.restaurant_id as string;
  const [{ data: restaurant }, { data: categories }, { data: menu }] = await Promise.all([
    sb.from("restaurants").select("*").eq("id", rid).single(),
    sb.from("categories").select("*").eq("restaurant_id", rid).order("position"),
    sb.from("menu_items").select(MENU_SELECT).eq("restaurant_id", rid).order("position").order("position", { referencedTable: "item_options" }).order("position", { referencedTable: "item_addons" }),
  ]);
  if (!restaurant) notFound();
  return (
    <VenueProvider restaurant={restaurant as Restaurant}>
    <GuestApp
      slug={slug}
      tableNumber={info.table_number}
      pinRequired={info.pin_required}
      restaurant={restaurant as Restaurant}
      categories={(categories ?? []) as Category[]}
      initialMenu={(menu ?? []) as MenuItem[]}
    />
    </VenueProvider>
  );
}
