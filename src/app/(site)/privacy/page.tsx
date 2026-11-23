import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Privacy policy", description: "What the SniffOrbit demonstration store stores, why, and for how long.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy policy"
      updated="November 2026"
      intro="SniffOrbit is a concept and portfolio project. This policy describes exactly what this website stores — it collects as little as it can."
    >
      <h2>What we store</h2>
      <ul>
        <li>
          <strong>Test orders:</strong> name, email, optional phone, shipping address, chosen items and totals, order status history, and a one-way hash
          of your private tracking key. No payment card details are ever collected by this site.
        </li>
        <li>
          <strong>Contact messages:</strong> your name, email, topic, optional order reference and message.
        </li>
        <li>
          <strong>Newsletter:</strong> your email address and where you signed up.
        </li>
        <li>
          <strong>Security data:</strong> to rate-limit abuse, we keep short-lived counters keyed by a keyed hash of your IP address — not the address
          itself.
        </li>
      </ul>
      <h2>Cookies and local storage</h2>
      <ul>
        <li>
          <strong>Cart</strong> — kept in your browser&apos;s local storage so it survives refreshes. It never leaves your device until you check out.
        </li>
        <li>
          <strong>so_order</strong> — an httpOnly cookie that lets this browser show the confirmation for the order you just placed. Expires after 30
          days.
        </li>
        <li>
          <strong>Admin session</strong> — only for store administrators who sign in.
        </li>
      </ul>
      <p>There are no advertising or analytics trackers on this site.</p>
      <h2>Payments</h2>
      <p>
        By default the store runs in test-order mode and takes no payment. If Stripe test mode is enabled, card details are entered on Stripe&apos;s
        hosted page and never touch this site; we store only the Stripe session reference and payment status.
      </p>
      <h2>Why we use it</h2>
      <p>Only to run the demonstration store: show and track your test order, read your message, and send the occasional newsletter you asked for.</p>
      <h2>Sharing</h2>
      <p>We don&apos;t sell or share your data. It&apos;s stored in this project&apos;s PostgreSQL database and is visible only to the store administrator.</p>
      <h2>Your choices</h2>
      <p>
        To have your test orders, messages or newsletter subscription deleted, <Link href="/contact">send a request</Link> with the email you used.
      </p>
    </LegalPage>
  );
}
