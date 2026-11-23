import { z } from "zod";
import { orderStatusSchema } from "@/lib/validation/admin";
import { adminRoute } from "@/server/admin-route";
import { ok } from "@/server/http";
import { listOrders } from "@/server/services/admin";

const querySchema = z.object({
  q: z.string().max(100).optional(),
  status: orderStatusSchema.or(z.literal("all")).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
});

export const GET = adminRoute(async (req) => {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const query = querySchema.parse(params);
  return ok(await listOrders(query));
});
