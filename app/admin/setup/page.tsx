import { redirect } from "next/navigation";
import { SetupWizard } from "@/components/admin/SetupWizard";
import { getStaff, serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// First run for a new account: create the restaurant. Anyone already on a team goes to their screen.
export default async function SetupPage() {
  const staff = await getStaff();
  if (staff) redirect(staff.role === "owner" ? "/admin" : "/staff");
  const { data } = await (await serverClient()).auth.getClaims();
  if (!data?.claims || data.claims.is_anonymous) redirect("/login");
  return <SetupWizard email={String(data.claims.email ?? "")} />;
}
