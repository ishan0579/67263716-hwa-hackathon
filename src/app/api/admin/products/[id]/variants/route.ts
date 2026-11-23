import { z } from "zod";
import { variantInputSchema } from "@/lib/validation/admin";
import { adminRoute } from "@/server/admin-route";
import { ok, readJson } from "@/server/http";
import { createVariant } from "@/server/services/admin";

type Ctx = { params: Promise<{ id: string }> };

export const POST = adminRoute<Ctx>(async (req, { params }, admin) => {
  const productId = z.uuid().parse((await params).id);
  const input = await readJson(req, variantInputSchema);
  const variant = await createVariant(productId, input, admin.id);
  return ok({ variant }, { status: 201 });
});
