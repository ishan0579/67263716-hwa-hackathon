import { inventoryAdjustmentSchema } from "@/lib/validation/admin";
import { adminRoute } from "@/server/admin-route";
import { ok, readJson } from "@/server/http";
import { adjustInventory, listInventory } from "@/server/services/admin";

export const GET = adminRoute(async () => ok({ inventory: await listInventory() }));

export const POST = adminRoute(async (req, _ctx, admin) => {
  const input = await readJson(req, inventoryAdjustmentSchema);
  const row = await adjustInventory(input, admin.id);
  return ok({ inventory: row });
});
