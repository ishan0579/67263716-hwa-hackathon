import { productInputSchema } from "@/lib/validation/admin";
import { adminRoute } from "@/server/admin-route";
import { ok, readJson } from "@/server/http";
import { createProduct, listProductsAdmin } from "@/server/services/admin";

export const GET = adminRoute(async () => ok({ products: await listProductsAdmin() }));

export const POST = adminRoute(async (req) => {
  const input = await readJson(req, productInputSchema);
  const product = await createProduct(input);
  return ok({ product }, { status: 201 });
});
