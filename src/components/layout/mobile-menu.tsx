"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { FOOTER_NAV, PRIMARY_NAV } from "@/lib/site";
import { Sheet } from "../ui/sheet";
import { ArrowUpRight, Close } from "../ui/icons";
import { BrandMark, Wordmark } from "./brand-mark";

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const links = [{ href: "/", label: "Home" }, ...PRIMARY_NAV, { href: "/product/snifforbit-one", label: "Shop ONE" }];
  return (
    <Sheet open={open} onClose={onClose} side="full" label="Site menu" className="grain relative flex flex-col bg-forest text-ivory">
      <div data-surface="dark" className="container-x flex h-[4.5rem] items-center justify-between">
        <Link href="/" onClick={onClose} className="flex items-center gap-2.5" aria-label="SniffOrbit home">
          <BrandMark className="size-8" />
          <Wordmark />
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="grid size-11 place-items-center rounded-full hover:bg-white/10"
          aria-label="Close menu"
          autoFocus
        >
          <Close size={24} />
        </button>
      </div>
      <nav aria-label="Mobile" className="container-x flex flex-1 flex-col justify-between overflow-y-auto pb-8 pt-6">
        <ul className="flex flex-col">
          {links.map((l, i) => (
            <motion.li
              key={l.href}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.045, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="border-b border-ivory/10"
            >
              <Link
                href={l.href}
                onClick={onClose}
                className="flex items-center justify-between py-3.5 font-display text-[2.4rem] font-semibold leading-none tracking-[-0.03em]"
                style={{ fontVariationSettings: '"wdth" 82' }}
              >
                {l.label}
                <ArrowUpRight size={22} className="opacity-50" />
              </Link>
            </motion.li>
          ))}
        </ul>
        <div className="mt-10 grid grid-cols-2 gap-6 text-sm">
          {(["Support", "Company"] as const).map((group) => (
            <div key={group}>
              <p className="text-eyebrow mb-3 text-mint">{group}</p>
              <ul className="space-y-2 text-ivory/75">
                {FOOTER_NAV[group].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} onClick={onClose} className="hover:text-ivory">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </Sheet>
  );
}
