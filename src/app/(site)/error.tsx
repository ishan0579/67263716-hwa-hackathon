"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section data-nav="light" className="grid min-h-[80svh] place-items-center bg-ivory px-4 pt-24 text-forest">
      <div className="max-w-lg text-center">
        <p className="text-eyebrow text-forest-500">Something went wrong</p>
        <h1 className="text-display-3 mt-4">A loose part in the mechanism.</h1>
        <p className="mt-5 text-graphite/70">
          We hit an unexpected error loading this page. Your cart is safe — it&apos;s stored in your browser.
          {error.digest && <span className="mt-2 block font-mono text-xs">Reference: {error.digest}</span>}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/" variant="outline">
            Back home
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
