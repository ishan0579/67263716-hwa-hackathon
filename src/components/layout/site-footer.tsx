import Link from "next/link";
import { FOOTER_NAV } from "@/lib/site";
import { NewsletterForm } from "../forms/newsletter-form";
import { FooterWordmark } from "./footer-wordmark";
import { BrandMark } from "./brand-mark";

export function SiteFooter() {
  return (
    <footer data-nav="dark" data-surface="dark" className="grain relative overflow-hidden bg-forest-900 text-ivory">
      <div className="container-x relative pt-20 sm:pt-28">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-eyebrow text-mint">Field notes</p>
            <h2 className="text-display-4 mt-4 max-w-[18ch]">
              Follow the design journey <span className="font-serif-italic text-mint">— prototypes, mistakes and all.</span>
            </h2>
            <div className="mt-8">
              <NewsletterForm source="footer" />
            </div>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
            {Object.entries(FOOTER_NAV).map(([group, links]) => (
              <div key={group}>
                <p className="text-eyebrow mb-5 text-ivory/50">{group}</p>
                <ul className="space-y-3">
                  {links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-[0.95rem] text-ivory/80 transition-colors hover:text-ivory">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-20 grid gap-6 border-t border-ivory/10 pt-8 text-sm text-ivory/60 md:grid-cols-3">
          <div className="flex items-center gap-3">
            <BrandMark className="size-6 text-ivory" />
            <span>© {new Date().getFullYear()} SniffOrbit — a concept design project.</span>
          </div>
          <p className="md:text-center">
            Questions? <Link href="/contact" className="text-ivory underline underline-offset-4">Send us a message</Link>
          </p>
          <p className="md:text-right">Test orders only · no payments are processed</p>
        </div>
      </div>
      <FooterWordmark />
    </footer>
  );
}
