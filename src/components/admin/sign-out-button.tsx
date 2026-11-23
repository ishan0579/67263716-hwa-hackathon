"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { adminRequest, toAdminError } from "./api";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await adminRequest("/api/admin/logout", { method: "POST" });
      router.replace("/admin/login");
      router.refresh();
    } catch (err) {
      setPending(false);
      push({ tone: "error", title: "Couldn't sign out", description: toAdminError(err).message });
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-current/25 px-4 text-sm font-medium transition-colors hover:border-current/60 hover:bg-current/[0.06] disabled:cursor-wait disabled:opacity-60",
        className,
      )}
    >
      {pending ? <Spinner className="size-4" /> : <LogOut size={17} />}
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
