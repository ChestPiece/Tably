import type { Metadata } from "next";
import { LegalPage } from "@/components/app/legal-page";

export const metadata: Metadata = { title: "Terms", description: "The terms for using Tably during the free beta." };

export default function Terms() {
  return (
    <LegalPage title="Terms" updated="21 November 2026">
      <p>
        Tably lets a restaurant put its menu on a QR code at each table, take orders from guests&apos; phones and run them on a
        live kitchen board. These terms apply to restaurant owners and staff who create an account.
      </p>
      <h2>Free beta</h2>
      <p>
        Tably is free while it is in beta. It is offered as it is, without a guarantee that it will always be available or free
        of mistakes. We will tell owners by email at least 30 days before any paid plan starts, and nothing is charged without
        your agreement.
      </p>
      <h2>Your restaurant, your responsibility</h2>
      <ul>
        <li>You are responsible for your menu, prices, taxes, allergen information and the food you serve.</li>
        <li>Tably does not take payments. Guests pay you directly, the way you already accept money.</li>
        <li>You decide who on your team gets an account and you remove people who leave.</li>
        <li>Keep your password private. You are responsible for what happens under your account.</li>
      </ul>
      <h2>Fair use</h2>
      <p>
        Do not use Tably for anything unlawful, to collect data about guests beyond running their order, or to try to reach other
        restaurants&apos; data. We may suspend an account that does.
      </p>
      <h2>Ending</h2>
      <p>
        You can stop using Tably at any time and ask us to delete your restaurant and its data. We may change or end the beta;
        if we end it, we will give owners at least 30 days to export what they need.
      </p>
    </LegalPage>
  );
}
