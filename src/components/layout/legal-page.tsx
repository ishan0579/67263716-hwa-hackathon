import type { ReactNode } from "react";
import { PageHeader } from "./page-header";

/** Readable long-form layout for policy pages. */
export function LegalPage({ title, eyebrow, updated, intro, children }: { title: string; eyebrow: string; updated: string; intro: string; children: ReactNode }) {
  return (
    <>
      <PageHeader size="md" eyebrow={eyebrow} title={title} lede={intro} crumbs={[{ label: eyebrow }]} />
      <section data-nav="light" className="bg-ivory pb-28 text-forest">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <p className="text-eyebrow text-graphite/55 lg:col-span-3">Last updated {updated}</p>
          <article className="max-w-[68ch] space-y-5 text-[1.02rem] leading-relaxed text-graphite/85 lg:col-span-8 lg:col-start-5 [&_h2]:mt-12 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-[-0.02em] [&_h2]:text-forest [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2 [&_a]:underline [&_a]:underline-offset-4">
            {children}
          </article>
        </div>
      </section>
    </>
  );
}
