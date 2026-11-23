import { getProductBySlug } from "@/server/services/catalog";
import { ApiError, ok, route } from "@/server/http";

export const GET = route<{ params: Promise<{ slug: string }> }>(async (_req, { params }) => {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) throw new ApiError(404, "not_found", "Product not found.");
  return ok({ productId: product.id, variants: product.variants });
});
