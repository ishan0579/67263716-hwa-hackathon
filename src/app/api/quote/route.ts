import { quoteSchema } from "@/lib/validation/checkout";
import { ok, readJson, route } from "@/server/http";
import { describeIssue, quoteCart } from "@/server/services/quote";

/** POST /api/quote — authoritative price quotation for a set of cart lines. */
export const POST = route(async (req) => {
  const { lines, shippingMethod } = await readJson(req, quoteSchema);
  const quote = await quoteCart(lines, shippingMethod);
  return ok({
    quote: {
      ...quote,
      lines: quote.lines.map((l) => ({ ...l, message: l.issue ? describeIssue(l.issue) : null })),
    },
  });
});
