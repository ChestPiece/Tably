import type { Metadata } from "next";
import { LegalPage } from "@/components/app/legal-page";

export const metadata: Metadata = { title: "Privacy Policy", description: "What Tably stores, why, and for how long." };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="21 November 2026">
      <p>Tably stores only what it needs to run orders for a restaurant. We do not sell data and we do not use ad trackers.</p>
      <h2>Restaurant owners and staff</h2>
      <ul>
        <li>Your email address and a secure hash of your password, to sign you in.</li>
        <li>Your restaurant&apos;s details, menu, tables and orders, which you and your team manage.</li>
        <li>For owners only: dish costs, staff hourly rates and shift times, used for the profit page. Staff never see these.</li>
      </ul>
      <h2>Guests</h2>
      <ul>
        <li>Guests do not create an account or give an email. Their phone gets an anonymous session for the table visit.</li>
        <li>A first name is optional and only shows the staff whose order is whose.</li>
        <li>Orders are kept as the restaurant&apos;s sales record.</li>
        <li>Anonymous sessions that never joined a table are deleted after 30 days.</li>
      </ul>
      <h2>Cookies and storage</h2>
      <p>
        We use a sign-in session, the language you chose, and on guest phones the cart for the current table. Nothing is used
        for advertising or tracking across sites.
      </p>
      <h2>Where data lives</h2>
      <p>
        Data is stored with Supabase (database and sign-in) and the app is served by Vercel. Each restaurant can only see its
        own data.
      </p>
      <h2>Your choices</h2>
      <p>Owners can ask us to export or delete their restaurant and all its data. Staff can ask the owner, or us, to remove their account.</p>
    </LegalPage>
  );
}
