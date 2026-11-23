"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { adminRequest } from "./api";
import { useAdminFeedback } from "./use-admin-feedback";

type Status = "new" | "read" | "archived";

const LABELS: Record<Status, { button: string; done: string }> = {
  read: { button: "Mark as read", done: "Marked as read" },
  new: { button: "Mark as unread", done: "Marked as unread" },
  archived: { button: "Archive", done: "Message archived" },
};

/** Status actions for a contact submission (PATCH /api/admin/messages/[id]). */
export function MessageActions({ id, status, from }: { id: string; status: Status; from: string }) {
  const { fail, success, refresh, refreshing } = useAdminFeedback();
  const [pendingTo, setPendingTo] = useState<Status | null>(null);
  const busy = pendingTo !== null || refreshing;

  const actions: { to: Status; label: string }[] =
    status === "new"
      ? [
          { to: "read", label: LABELS.read.button },
          { to: "archived", label: LABELS.archived.button },
        ]
      : status === "read"
        ? [
            { to: "new", label: LABELS.new.button },
            { to: "archived", label: LABELS.archived.button },
          ]
        : [{ to: "read", label: "Restore to inbox" }];

  async function setStatus(to: Status) {
    setPendingTo(to);
    try {
      await adminRequest(`/api/admin/messages/${id}`, { method: "PATCH", body: { status: to } });
      success(status === "archived" && to === "read" ? "Message restored" : LABELS[to].done, `From ${from}.`);
      refresh();
    } catch (err) {
      fail(err, "Couldn't update the message");
    } finally {
      setPendingTo(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a, i) => (
        <button
          key={a.to}
          type="button"
          onClick={() => setStatus(a.to)}
          disabled={busy}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-60",
            i === 0 ? "bg-forest text-ivory hover:bg-forest-600" : "border border-graphite/15 text-forest hover:border-forest/40 hover:bg-forest/[0.04]",
          )}
        >
          {pendingTo === a.to && <Spinner className="size-3.5" />}
          {a.label}
          <span className="sr-only"> — message from {from}</span>
        </button>
      ))}
    </div>
  );
}
