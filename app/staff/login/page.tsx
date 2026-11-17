import { redirect } from "next/navigation";

// Old sign-in URL; owner and staff share /login now.
export default function OldStaffLogin() {
  redirect("/login");
}
