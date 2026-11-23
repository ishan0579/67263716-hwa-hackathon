import { newsletterSchema } from "@/lib/validation/forms";
import { assertSameOrigin, clientIp, ok, readJson, route } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { subscribeToNewsletter } from "@/server/services/messages";

export const POST = route(async (req) => {
  assertSameOrigin(req);
  await enforceRateLimit("newsletter", clientIp(req), 8, 3600);
  const { email, source } = await readJson(req, newsletterSchema);
  const result = await subscribeToNewsletter(email, source);
  return ok({ subscribed: true, alreadySubscribed: result.alreadySubscribed });
});
