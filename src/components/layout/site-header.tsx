"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useHydrated } from "@/hooks/use-client";
import { PRIMARY_NAV } from "@/lib/site";
import { useCartCount } from "@/lib/cart/store";
import { cn } from "@/lib/utils";
import { useCartUI } from "../cart/cart-ui";
import { Bag, Menu } from "../ui/icons";
import { BrandMark, Wordmark } from "./brand-mark";
import { MobileMenu } from "./mobile-menu";

type Tone = "light" | "dark";

/**
 * Sticky header that
 *  - adapts its colours to the section beneath it (`data-nav="dark"` on dark sections),
 *  - hides while scrolling down and returns on scroll up,
 *  - keeps a cart button with a live item count.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [tone, setTone] = useState<Tone>("light");
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const count = useCartCount();
  const mounted = useHydrated();
  const { openCart } = useCartUI();
  const last = useRef(0);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let raf = 0;

    /** Section under the header, ignoring the header itself and overlays (loader, toasts, cursor). */
    const sampleTone = () => {
      const els = document.elementsFromPoint(window.innerWidth / 2, 40);
      const host = els
        .find((el) => !headerRef.current?.contains(el) && !el.closest("[data-nav-ignore]"))
        ?.closest<HTMLElement>("[data-nav]");
      setTone((host?.dataset.nav as Tone) ?? "light");
    };

    const update = () => {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 12);
      const delta = y - last.current;
      if (Math.abs(delta) > 6) {
        setHidden(delta > 0 && y > 160);
        last.current = y;
      }
      sampleTone();
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    // Initial sync after layout: start from the current position so a restored scroll
    // offset never hides the header on load, and pick the tone of the section beneath.
    raf = requestAnimationFrame(() => {
      raf = 0;
      last.current = window.scrollY;
      setHidden(false);
      setScrolled(window.scrollY > 12);
      sampleTone();
    });
    // Re-sample once late content (loader exit, fonts, images) has settled.
    const timers = [150, 600, 1500].map((ms) => setTimeout(sampleTone, ms));
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("load", sampleTone);
    window.addEventListener("so:loader-done", sampleTone);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("load", sampleTone);
      window.removeEventListener("so:loader-done", sampleTone);
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  // Close the mobile menu when the route changes (state adjusted during render, no effect needed).
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  const dark = tone === "dark";

  return (
    <>
      <a
        href="#main"
        className="fixed left-4 top-3 z-[70] -translate-y-24 rounded-full bg-forest px-4 py-2 text-sm font-medium text-ivory focus:translate-y-0"
      >
        Skip to content
      </a>
      <header
        ref={headerRef}
        data-surface={dark ? "dark" : "light"}
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[transform,background-color,color,box-shadow] duration-500 ease-[var(--ease-out-expo)]",
          hidden && !menuOpen ? "-translate-y-full" : "translate-y-0",
          dark ? "text-ivory" : "text-forest",
          scrolled && (dark ? "bg-forest/90 backdrop-blur-md" : "bg-ivory/90 backdrop-blur-md"),
          scrolled && "shadow-[0_1px_0_0_color-mix(in_oklab,currentColor_10%,transparent)]",
        )}
      >
        <div className="container-x flex h-[4.5rem] items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="SniffOrbit home">
            <BrandMark className="size-8" />
            <Wordmark />
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {PRIMARY_NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative rounded-full px-4 py-2 text-[0.93rem] font-medium transition-colors",
                        active ? "opacity-100" : "opacity-75 hover:opacity-100",
                      )}
                    >
                      {item.label}
                      {active && (
                        <motion.span
                          layoutId="nav-dot"
                          className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-coral"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/product/snifforbit-one"
              className={cn(
                "hidden h-10 items-center rounded-full px-5 text-sm font-medium transition-colors sm:inline-flex",
                "bg-coral text-forest hover:bg-coral-600",
              )}
            >
              Shop ONE
            </Link>
            <button
              type="button"
              onClick={openCart}
              className="relative grid size-11 place-items-center rounded-full transition-colors hover:bg-current/[0.08]"
              aria-label={`Open cart${mounted && count ? `, ${count} item${count === 1 ? "" : "s"}` : ", empty"}`}
            >
              <Bag size={22} />
              <AnimatePresence>
                {mounted && count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className="tabular absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[0.68rem] font-semibold text-forest"
                    aria-hidden="true"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="grid size-11 place-items-center rounded-full transition-colors hover:bg-current/[0.08] lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
