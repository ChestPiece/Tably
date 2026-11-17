import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

export async function serverClient() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Component render: proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

export type StaffContext = { userId: string; email: string; role: "owner" | "staff"; restaurantId: string };

export async function getStaff(): Promise<StaffContext | null> {
  const sb = await serverClient();
  const { data } = await sb.auth.getClaims();
  const claims = data?.claims;
  if (!claims || claims.is_anonymous) return null;
  const { data: member } = await sb
    .from("staff_members")
    .select("restaurant_id, role")
    .eq("user_id", claims.sub)
    .order("role")
    .limit(1)
    .maybeSingle();
  if (!member) return null;
  return { userId: claims.sub, email: String(claims.email ?? ""), role: member.role, restaurantId: member.restaurant_id };
}
