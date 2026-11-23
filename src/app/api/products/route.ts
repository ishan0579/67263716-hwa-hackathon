import { listActiveProducts } from "@/server/services/catalog";
import { ok, route } from "@/server/http";

export const GET = route(async () => {
  const products = await listActiveProducts();
  return ok({ products });
});
