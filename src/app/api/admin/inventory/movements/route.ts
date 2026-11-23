import { z } from "zod";
import { adminRoute } from "@/server/admin-route";
import { ok } from "@/server/http";
import { listMovements } from "@/server/services/admin";

const querySchema = z.object({
  variantId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const GET = adminRoute(async (req) => {
  const q = querySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return ok({ movements: await listMovements(q) });
});
