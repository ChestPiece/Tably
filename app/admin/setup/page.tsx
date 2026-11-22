import { redirect } from "next/navigation";
import { InvitedCard } from "@/components/admin/InvitedCard";
import { SetupWizard } from "@/components/admin/SetupWizard";
import { getStaff, serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// First run for a new account: create the restaurant. Anyone already on a team goes to their screen,
// and an email with a pending staff invite joins that team instead (one account, one restaurant).
export default async function SetupPage() {
  const staff = await getStaff();
  if (staff) redirect(staff.role === "owner" ? "/admin" : "/staff");
  const sb = await serverClient();
  const { data } = await sb.auth.getClaims();
  if (!data?.claims || data.claims.is_anonymous) redirect("/login");
  const { data: invite } = await sb.rpc("my_invite");
  if (invite) return <InvitedCard token={invite.token} restaurant={invite.restaurant} />;
  return <SetupWizard email={String(data.claims.email ?? "")} />;
}
