import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/forms/contact-form";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about the SniffOrbit concept or a test order? Send a message.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        size="md"
        eyebrow="Contact"
        title={["Questions, ideas,", "a test order?"]}
        lede="Send a note about the concept, your demo order or a collaboration. Messages go straight into the project's admin inbox."
        crumbs={[{ label: "Contact" }]}
      />
      <section data-nav="light" className="bg-ivory pb-28 text-forest">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ContactForm />
          </div>
          <aside className="space-y-8 lg:col-span-4 lg:col-start-9">
            <div>
              <h2 className="text-eyebrow text-graphite/55">Before you write</h2>
              <ul className="mt-4 space-y-3 text-[0.98rem] text-graphite/80">
                <li>
                  Looking for an order? <Link href="/order/track" className="underline underline-offset-4">Track it here</Link> with your reference and
                  key.
                </li>
                <li>
                  Most product questions are answered in the <Link href="/faq" className="underline underline-offset-4">FAQ</Link>.
                </li>
                <li>There&apos;s no phone line or physical address — this is a concept project.</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-sand/70 p-5 text-sm leading-relaxed text-graphite/75">
              Please don&apos;t include sensitive personal information. We only use your details to read and respond to your message.
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
