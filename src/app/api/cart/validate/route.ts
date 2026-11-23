import { quoteSchema } from "@/lib/validation/checkout";
import { ok, readJson, route } from "@/server/http";
import { describeIssue, quoteCart } from "@/server/services/quote";

/**
 * POST /api/cart/validate — reconciles a browser-persisted cart with the
 * database: current names, prices, stock and per-line issues.
 */
export const POST = route(async (req) => {
  const { lines, shippingMethod } = await readJson(req, quoteSchema);
  const quote = await quoteCart(lines, shippingMethod);
  return ok({
    valid: quote.valid,
    quote: {
      ...quote,
      lines: quote.lines.map((l) => ({ ...l, message: l.issue ? describeIssue(l.issue) : null })),
    },
  });
});
