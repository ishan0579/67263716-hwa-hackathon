import { z } from "zod";
import { updateOrderStatusSchema } from "@/lib/validation/admin";
import { adminRoute } from "@/server/admin-route";
import { ApiError, ok, readJson } from "@/server/http";
import { getOrderAdmin, updateOrderStatusAdmin } from "@/server/services/admin";

type Ctx = { params: Promise<{ id: string }> };
const idSchema = z.uuid();

export const GET = adminRoute<Ctx>(async (_req, { params }) => {
  const id = idSchema.parse((await params).id);
  const order = await getOrderAdmin(id);
  if (!order) throw new ApiError(404, "not_found", "Order not found.");
  return ok(order);
});

export const PATCH = adminRoute<Ctx>(async (req, { params }, admin) => {
  const id = idSchema.parse((await params).id);
  const { status, note } = await readJson(req, updateOrderStatusSchema);
  const order = await updateOrderStatusAdmin(id, status, note || undefined, admin.id);
  return ok({ order });
});
