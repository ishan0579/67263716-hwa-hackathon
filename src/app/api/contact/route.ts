import { contactSchema } from "@/lib/validation/forms";
import { assertSameOrigin, clientIp, ok, readJson, route } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { createContactSubmission } from "@/server/services/messages";

export const POST = route(async (req) => {
  assertSameOrigin(req);
  await enforceRateLimit("contact", clientIp(req), 5, 3600);
  const input = await readJson(req, contactSchema);
  const row = await createContactSubmission(input);
  return ok({ id: row.id, receivedAt: row.createdAt }, { status: 201 });
});
