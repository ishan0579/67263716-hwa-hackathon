"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { useRestoreFocus } from "./use-restore-focus";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Modal confirmation built on the shared native-<dialog> Sheet.
 * "Cancel" comes first in the DOM so it receives initial focus (safe default).
 *
 * Mounted only while open: the shared Sheet's centred variant applies
 * `display:grid` to the <dialog>, which would otherwise leave an invisible,
 * click-blocking layer over the page while closed.
 */
export function ConfirmDialog(props: Props) {
  if (!props.open) return null;
  return <OpenConfirmDialog {...props} />;
}

function OpenConfirmDialog({ title, children, confirmLabel, cancelLabel = "Keep it", pending, onConfirm, onClose }: Props) {
  useRestoreFocus();
  return (
    <Sheet open onClose={() => !pending && onClose()} side="center" label={title} className="max-h-[90dvh] overflow-y-auto bg-ivory p-6 text-graphite shadow-2xl sm:p-7">
      <div className="flex items-start gap-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-coral-200 text-[#7a2a0d]">
          <Alert size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold tracking-tight text-forest">{title}</h2>
          <div className="mt-2 text-sm leading-relaxed text-graphite/75">{children}</div>
        </div>
      </div>
      <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" size="sm" className="text-forest" onClick={onClose} disabled={pending}>
          {cancelLabel}
        </Button>
        <Button variant="primary" size="sm" onClick={onConfirm} loading={pending}>
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
