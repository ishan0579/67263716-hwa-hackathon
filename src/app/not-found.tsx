import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="grain relative grid min-h-[100svh] place-items-center overflow-hidden bg-forest px-4 text-ivory" data-nav="dark">
      <div className="relative max-w-xl text-center">
        <BrandMark className="mx-auto size-16 text-ivory" active={-1} />
        <p className="text-eyebrow mt-8 text-mint">Error 404</p>
        <h1 className="text-display-2 mt-4">Lost the scent.</h1>
        <p className="text-lede mx-auto mt-6 max-w-[40ch] text-ivory/70">
          This chamber is empty. The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex h-12 items-center rounded-full bg-coral px-6 font-medium text-forest hover:bg-coral-600">
            Back to home
          </Link>
          <Link href="/product/snifforbit-one" className="inline-flex h-12 items-center rounded-full border border-ivory/25 px-6 font-medium hover:border-ivory/70">
            See SniffOrbit ONE
          </Link>
        </div>
      </div>
    </main>
  );
}
