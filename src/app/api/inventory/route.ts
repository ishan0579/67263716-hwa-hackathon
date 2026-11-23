import { z } from "zod";
import { getVariantAvailability } from "@/server/services/catalog";
import { ok, route } from "@/server/http";

const idsSchema = z.array(z.uuid()).min(1).max(50);

/** GET /api/inventory?variantIds=<uuid>,<uuid> — public availability (no exact counts above the low-stock threshold). */
export const GET = route(async (req) => {
  const raw = new URL(req.url).searchParams.get("variantIds") ?? "";
  const ids = idsSchema.parse(raw.split(",").filter(Boolean));
  const variants = await getVariantAvailability(ids);
  return ok({
    availability: variants.map((v) => ({
      variantId: v.id,
      purchasable: v.purchasable,
      stockStatus: v.stockStatus,
      lowStockCount: v.lowStockCount,
      maxQuantity: v.purchasable ? v.maxQuantity : 0,
    })),
  });
});
