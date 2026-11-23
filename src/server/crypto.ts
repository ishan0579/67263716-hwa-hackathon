import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Crockford base32 — no I, L, O, U, so codes are easy to read aloud and retype. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function base32(bytes: Buffer, length: number) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && out.length < length) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    if (out.length >= length) break;
  }
  return out;
}

export function randomCode(length: number) {
  return base32(randomBytes(Math.ceil((length * 5) / 8) + 1), length);
}

export function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set to at least 32 characters in production.");
    }
    return "development-only-insecure-secret-change-me-please";
  }
  return s;
}

export function hmacHex(input: string) {
  return createHmac("sha256", secret()).update(input).digest("hex");
}

export function hmacBytes(input: string) {
  return createHmac("sha256", secret()).update(input).digest();
}

export function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && ab.length > 0 && timingSafeEqual(ab, bb);
}

/* ───────────────────────── Order identifiers ───────────────────────── */

/** Public, random, non-sequential order reference, e.g. SO-7KQ2-M9XD. */
export function generateOrderNumber() {
  const c = randomCode(8);
  return `SO-${c.slice(0, 4)}-${c.slice(4)}`;
}

/** Normalises a user-typed tracking key: upper-case, strip separators, fix look-alikes. */
export function normaliseTrackingKey(input: string) {
  return input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

export function formatTrackingKey(raw: string) {
  return raw.match(/.{1,4}/g)?.join("-") ?? raw;
}

/**
 * The guest tracking key (100 bits) is derived from the server secret, the
 * order id and the client's idempotency key. Only its SHA-256 hash is stored,
 * yet a retried checkout submission (same idempotency key) can be answered
 * with the same key without persisting the secret.
 */
export function deriveTrackingKey(orderId: string, idempotencyKey: string) {
  return base32(hmacBytes(`order-access:${orderId}:${idempotencyKey}`), 20);
}

export function hashTrackingKey(key: string) {
  return sha256Hex(`tracking:${normaliseTrackingKey(key)}`);
}
