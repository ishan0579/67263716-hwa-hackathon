import type { Metadata } from "next";
import { FAQ } from "@/content/faq";
import { PageHeader } from "@/components/layout/page-header";
import { Accordion } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "FAQ",
  description: "How SniffOrbit ONE works, sizes, cleaning, food, safety, and how the demonstration store handles orders.",
  alternates: { canonical: "/faq" },
};

const GROUPS = [
  { key: "Product", id: "product", title: "The product" },
  { key: "Safety", id: "safety", title: "Safety" },
  { key: "Orders", id: "orders", title: "Orders & this store" },
] as const;

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.text } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHeader size="md" eyebrow="FAQ" title={["Good questions,", "straight answers."]} crumbs={[{ label: "FAQ" }]} />
      <section data-nav="light" className="bg-ivory pb-28 text-forest">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <nav aria-label="FAQ sections" className="lg:col-span-3">
            <ul className="sticky top-28 space-y-2">
              {GROUPS.map((g) => (
                <li key={g.id}>
                  <a href={`#${g.id}`} className="text-[0.98rem] text-graphite/70 underline-offset-4 hover:text-forest hover:underline">
                    {g.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-16 lg:col-span-8 lg:col-start-5">
            {GROUPS.map((g) => (
              <section key={g.id} id={g.id} aria-labelledby={`${g.id}-h`} className="scroll-mt-28">
                <h2 id={`${g.id}-h`} className="text-display-4">
                  {g.title}
                </h2>
                <Accordion className="mt-6" items={FAQ.filter((f) => f.group === g.key).map((f) => ({ id: f.id, question: f.question, answer: f.answer }))} />
              </section>
            ))}
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/contact" variant="dark" arrow>
                Still curious? Ask us
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
