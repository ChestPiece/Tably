import { redirect } from "next/navigation";

// Public sign-up link for the landing page. The form lives on /login.
export default function Signup() {
  redirect("/login?signup");
}
