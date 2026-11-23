"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { toAdminError, type AdminApiError } from "./api";

/**
 * Shared success / failure feedback for admin mutations.
 * - A 401 means the session ended: tell the admin and send them to sign in.
 * - `refresh()` re-renders the server components; `refreshing` stays true until
 *   the fresh data has been committed, so buttons can keep their busy state.
 */
export function useAdminFeedback() {
  const router = useRouter();
  const { push } = useToast();
  const [refreshing, startTransition] = useTransition();

  const fail = useCallback(
    (err: unknown, title: string): AdminApiError => {
      const e = toAdminError(err);
      if (e.status === 401) {
        push({ tone: "error", title: "Your session has ended", description: "Please sign in again to continue." });
        router.replace("/admin/login");
        router.refresh();
        return e;
      }
      push({ tone: "error", title, description: e.message });
      return e;
    },
    [push, router],
  );

  const success = useCallback(
    (title: string, description?: string) => push({ tone: "success", title, description }),
    [push],
  );

  const refresh = useCallback(() => startTransition(() => router.refresh()), [router]);

  return { fail, success, router, refresh, refreshing };
}
