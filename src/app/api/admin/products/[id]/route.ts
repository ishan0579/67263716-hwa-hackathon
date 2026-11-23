import { z } from "zod";
import { productUpdateSchema } from "@/lib/validation/admin";
import { adminRoute } from "@/server/admin-route";
import { ApiError, ok, readJson } from "@/server/http";
import { getProductAdmin, updateProduct } from "@/server/services/admin";

type Ctx = { params: Promise<{ id: string }> };
const idSchema = z.uuid();

export const GET = adminRoute<Ctx>(async (_req, { params }) => {
  const data = await getProductAdmin(idSchema.parse((await params).id));
  if (!data) throw new ApiError(404, "not_found", "Product not found.");
  return ok(data);
});

export const PATCH = adminRoute<Ctx>(async (req, { params }) => {
  const id = idSchema.parse((await params).id);
  const input = await readJson(req, productUpdateSchema);
  return ok({ product: await updateProduct(id, input) });
});
