import { NextResponse } from "next/server";
import { ZodError, type ZodType, z } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiErrorBody = {
  error: { code: string; message: string; fieldErrors?: Record<string, string>; details?: unknown };
};

/** Flattens Zod issues into `{ "contact.email": "Enter a valid email" }`. */
export function zodFieldErrors(err: ZodError) {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json<ApiErrorBody>(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json<ApiErrorBody>(
      {
        error: {
          code: "validation_error",
          message: "Some details need attention.",
          fieldErrors: zodFieldErrors(err),
        },
      },
      { status: 422 },
    );
  }
  console.error("[api] unexpected error", err);
  return NextResponse.json<ApiErrorBody>(
    { error: { code: "internal_error", message: "Something went wrong on our side. Please try again." } },
    { status: 500 },
  );
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler with uniform error handling. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

const MAX_BODY_BYTES = 64 * 1024;

/**
 * Parses and validates a JSON body. Rejects non-JSON content types (which also
 * blocks simple cross-site form posts) and oversized payloads.
 */
export async function readJson<S extends ZodType>(req: Request, schema: S): Promise<z.output<S>> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Expected a JSON request body.");
  }
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new ApiError(413, "payload_too_large", "Request body is too large.");
  }
  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(400, "invalid_json", "Request body is not valid JSON.");
  }
  return schema.parse(raw);
}

/** Rejects cross-origin mutation requests (defence in depth on top of SameSite cookies). */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients (tests, curl) don't send Origin
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) {
      throw new ApiError(403, "forbidden_origin", "Cross-origin requests are not allowed.");
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(403, "forbidden_origin", "Cross-origin requests are not allowed.");
  }
}

export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "local";
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}
