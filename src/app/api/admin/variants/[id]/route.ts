import { z } from "zod";
import { variantUpdateSchema } from "@/lib/validation/admin";
import { adminRoute } from "@/server/admin-route";
import { ok, readJson } from "@/server/http";
import { updateVariant } from "@/server/services/admin";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminRoute<Ctx>(async (req, { params }) => {
  const id = z.uuid().parse((await params).id);
  const input = await readJson(req, variantUpdateSchema);
  return ok({ variant: await updateVariant(id, input) });
});
