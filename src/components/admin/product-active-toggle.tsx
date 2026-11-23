"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { adminRequest } from "./api";
import { ActiveBadge } from "./badges";
import { useAdminFeedback } from "./use-admin-feedback";

/** Publishes / unpublishes a product (PATCH { isActive }). */
export function ProductActiveToggle({ productId, isActive, activeVariantCount }: { productId: string; isActive: boolean; activeVariantCount: number }) {
  const { fail, success, refresh, refreshing } = useAdminFeedback();
  const [saving, setSaving] = useState(false);
  const busy = saving || refreshing;

  async function toggle() {
    setSaving(true);
    try {
      await adminRequest(`/api/admin/products/${productId}`, { method: "PATCH", body: { isActive: !isActive } });
      success(
        isActive ? "Product hidden from the store" : "Product is now live",
        isActive
          ? "Customers can no longer view or order it."
          : activeVariantCount === 0
            ? "Add an active variant so customers can order it."
            : "Customers can view and order its active variants.",
      );
      refresh();
    } catch (err) {
      fail(err, "Couldn't change visibility");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <ActiveBadge active={isActive} activeLabel="Live in store" inactiveLabel="Hidden from store" />
      <Button variant={isActive ? "outline" : "dark"} size="sm" className={isActive ? "text-forest" : undefined} loading={busy} onClick={toggle}>
        {isActive ? "Deactivate" : "Activate"}
      </Button>
    </div>
  );
}
