import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Terms & conditions", description: "Terms for using the SniffOrbit concept site and its demonstration store.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms & conditions"
      updated="November 2026"
      intro="Plain-language terms for a concept product and a store that runs in test mode."
    >
      <h2>1. A concept, not a product for sale</h2>
      <p>
        SniffOrbit ONE is a design concept. It has not been manufactured, safety-tested or certified, and it is not currently available to buy. Images
        are renders of a 3D model. Specifications marked &ldquo;provisional&rdquo; are design targets.
      </p>
      <h2>2. Test orders</h2>
      <ul>
        <li>Orders placed on this site are demonstration orders. They create real records so the store can be evaluated end-to-end.</li>
        <li>No payment is requested or taken in test-order mode. If Stripe test mode is enabled, only Stripe test payments are possible — no real charge occurs.</li>
        <li>No goods will be shipped, and a test order does not form a contract of sale.</li>
        <li>Prices, stock levels and delivery estimates are demonstration data.</li>
      </ul>
      <h2>3. Acceptable use</h2>
      <p>Please don&apos;t attempt to disrupt the service, access other people&apos;s orders, or submit automated or abusive requests. Requests are rate limited.</p>
      <h2>4. No advice</h2>
      <p>
        Content including the Dog Match quiz is general guidance based on simple, published rules. It is not veterinary or behavioural advice. Always
        supervise your dog with any food puzzle.
      </p>
      <h2>5. Intellectual property</h2>
      <p>The SniffOrbit name, designs, illustrations and code on this site belong to the project&apos;s author unless stated otherwise.</p>
      <h2>6. Liability</h2>
      <p>The site is provided as-is for demonstration purposes, to the extent permitted by law.</p>
      <h2>7. Contact</h2>
      <p>
        Questions? <Link href="/contact">Get in touch</Link>.
      </p>
    </LegalPage>
  );
}
