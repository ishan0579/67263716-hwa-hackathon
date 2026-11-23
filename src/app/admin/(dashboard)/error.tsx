"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Rotate } from "@/components/ui/icons";

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";

  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-graphite/10 bg-white px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-coral-200 text-[#7a2a0d]">
        <Alert size={22} />
      </span>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-forest">This page couldn&apos;t load</h1>
      <p className="max-w-[44ch] text-sm leading-relaxed text-graphite/70">
        Something went wrong while loading admin data. It may be a temporary database or network issue — try again, or head back to the overview.
      </p>
      {digest && <p className="font-mono text-xs text-graphite/50">Reference: {digest}</p>}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button
          variant="dark"
          size="sm"
          loading={retrying}
          icon={<Rotate size={16} />}
          onClick={() => {
            setRetrying(true);
            retry();
            setTimeout(() => setRetrying(false), 1500);
          }}
        >
          Try again
        </Button>
        <ButtonLink href="/admin" variant="outline" size="sm" className="text-forest">
          Back to overview
        </ButtonLink>
      </div>
    </div>
  );
}
