import { z } from "zod";
import { contactStatusUpdateSchema } from "@/lib/validation/admin";
import { adminRoute } from "@/server/admin-route";
import { ApiError, ok, readJson } from "@/server/http";
import { setContactStatus } from "@/server/services/messages";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminRoute<Ctx>(async (req, { params }) => {
  const id = z.uuid().parse((await params).id);
  const { status } = await readJson(req, contactStatusUpdateSchema);
  const row = await setContactStatus(id, status);
  if (!row) throw new ApiError(404, "not_found", "Message not found.");
  return ok({ message: row });
});
