import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PuzzleSimulation } from "@/components/simulation/puzzle-simulation";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: "Interactive puzzle experience",
  description:
    "Play the SniffOrbit ONE concept in your browser: load chambers, sniff the scent ports, push the spring shutter and watch the ratchet index the tray.",
  alternates: { canonical: "/experience" },
};

export default function ExperiencePage() {
  return (
    <>
      <PageHeader
        tone="dark"
        eyebrow="Interactive demo"
        title={["Play the orbit."]}
        lede="A working model of the proposed mechanism. You set it up like an owner, then play it like a dog."
        crumbs={[{ label: "Experience" }]}
      />
      <section data-nav="dark" data-surface="dark" aria-label="Puzzle simulation" className="bg-forest pb-24 text-ivory">
        <div className="container-x">
          <PuzzleSimulation tone="dark" />
        </div>
      </section>
      <section data-nav="light" aria-labelledby="howto-title" className="bg-ivory py-24 text-forest">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Eyebrow>How to play</Eyebrow>
            <h2 id="howto-title" className="text-display-3 mt-5">
              Four moves, six chambers.
            </h2>
            <ol className="mt-8 space-y-5">
              {[
                ["Set up", "Toggle which chambers hold a treat and choose which chamber starts under the window."],
                ["Sniff", "Tap a scent port. A strong scent means an undiscovered treat sits beneath it — that many clicks away."],
                ["Push", "Drag the coral shutter (or use the slider) past the open point. Some inserts need a lift or a tip first."],
                ["Release", "Let the spring snap it shut. A full stroke clicks the ratchet and brings the next chamber to the window."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="tabular grid size-8 shrink-0 place-items-center rounded-full bg-coral font-semibold text-forest">{i + 1}</span>
                  <div>
                    <p className="font-medium">{t}</p>
                    <p className="mt-1 text-graphite/70">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <Eyebrow>Honest notes</Eyebrow>
            <h2 className="text-display-4 mt-5">What this demo is — and isn&apos;t</h2>
            <div className="mt-6 space-y-4 text-graphite/80">
              <p>
                It&apos;s a faithful model of the proposed logic: one window, a spring-return shutter, a ratchet that only indexes on a full stroke,
                and inserts that sometimes need a second move.
              </p>
              <p>
                It isn&apos;t evidence that a real dog will enjoy or solve the puzzle in a particular way. The physical mechanism has not been
                prototyped, and timings here say nothing about real engagement.
              </p>
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/how-it-works" variant="dark" arrow>
                See the mechanism
              </ButtonLink>
              <ButtonLink href="/customize" variant="outline">
                Customize yours
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
