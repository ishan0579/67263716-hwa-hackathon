import type { Metadata } from "next";
import { DogMatchQuiz } from "@/components/dog-match/dog-match-quiz";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Dog Match — find the right size and starting level",
  description: "A seven-question consultation that suggests a SniffOrbit ONE size and starting difficulty using transparent, explainable rules.",
  alternates: { canonical: "/dog-match" },
};

export default function DogMatchPage() {
  return (
    <>
      <PageHeader size="md" eyebrow="Dog Match" title={["A two-minute", "product consultation."]} crumbs={[{ label: "Dog Match" }]} />
      <section data-nav="light" className="bg-ivory pb-28 text-forest">
        <div className="container-x">
          <DogMatchQuiz />
        </div>
      </section>
    </>
  );
}
