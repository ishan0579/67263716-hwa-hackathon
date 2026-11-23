/**
 * Tiny client for the admin JSON API. The routes enforce auth, same-origin and
 * validation; this only normalises transport and error handling.
 */
export type FieldErrors = Record<string, string>;

export class AdminApiError extends Error {
  status: number;
  code: string;
  fieldErrors?: FieldErrors;

  constructor(status: number, code: string, message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

type ErrorBody = { error?: { code?: string; message?: string; fieldErrors?: FieldErrors } };

export async function adminRequest<T = unknown>(
  url: string,
  opts: { method?: "GET" | "POST" | "PATCH"; body?: unknown } = {},
): Promise<T> {
  const { method = "GET", body } = opts;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: body !== undefined ? { "content-type": "application/json", accept: "application/json" } : { accept: "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AdminApiError(0, "network_error", "Couldn't reach the server. Check your connection and try again.");
  }

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as ErrorBody | null)?.error;
    if (res.status === 401) {
      throw new AdminApiError(401, err?.code ?? "unauthorized", err?.message ?? "Please sign in as an administrator.");
    }
    throw new AdminApiError(
      res.status,
      err?.code ?? "http_error",
      err?.message ?? `The request failed (HTTP ${res.status}). Please try again.`,
      humanizeFieldErrors(err?.fieldErrors),
    );
  }
  return data as T;
}

export function toAdminError(err: unknown): AdminApiError {
  if (err instanceof AdminApiError) return err;
  return new AdminApiError(0, "unknown_error", err instanceof Error ? err.message : "Something went wrong.");
}

/**
 * Rewrites zod's generic default messages (used where the shared schemas have
 * no custom message) into plain language. Custom messages pass through.
 */
export function humanizeMessage(message: string): string {
  let m: RegExpMatchArray | null;
  if ((m = message.match(/^Too small: expected string to have >=?(\d+) characters?/))) {
    return m[1] === "1" ? "This field is required" : `Enter at least ${m[1]} characters`;
  }
  if ((m = message.match(/^Too big: expected string to have <=?(\d+) characters?/))) return `Keep this under ${Number(m[1]) + 1} characters`;
  if ((m = message.match(/^Too small: expected number to be >=?(-?\d+)/))) return `Must be ${m[1]} or more`;
  if ((m = message.match(/^Too big: expected number to be <=?(-?\d+)/))) return `Must be ${Number(m[1]).toLocaleString("en-US")} or less`;
  if ((m = message.match(/^Too big: expected array to have <=?(\d+) items?/))) return `Up to ${m[1]} items allowed`;
  if (/expected number, received NaN/.test(message)) return "Enter a number";
  if (/expected int, received number/.test(message)) return "Enter a whole number";
  if (/^Invalid input: expected string/.test(message)) return "This field is required";
  return message;
}

/** Flattens zod issues into the same dot-path shape the API returns. */
export function issuesToFieldErrors(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_";
    if (!out[key]) out[key] = humanizeMessage(issue.message);
  }
  return out;
}

function humanizeFieldErrors(fe: FieldErrors | undefined): FieldErrors | undefined {
  if (!fe) return fe;
  return Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, humanizeMessage(v)]));
}
