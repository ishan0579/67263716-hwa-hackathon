import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Password hashing with Node's built-in scrypt (memory-hard, OWASP-recommended).
 * Format: scrypt$<N>$<r>$<p>$<salt b64url>$<hash b64url>
 */
const PARAMS = { N: 2 ** 16, r: 8, p: 1 };
const KEY_LEN = 64;

function scryptAsync(password: string, salt: Buffer, keylen: number, opts: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

const maxmem = (N: number, r: number) => 128 * N * r * 2;

export async function hashPassword(password: string) {
  if (password.length < 10) throw new Error("Admin passwords must be at least 10 characters.");
  const salt = randomBytes(16);
  const { N, r, p } = PARAMS;
  const key = await scryptAsync(password, salt, KEY_LEN, { N, r, p, maxmem: maxmem(N, r) });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nS, rS, pS, saltS, hashS] = parts;
  const N = Number(nS);
  const r = Number(rS);
  const p = Number(pS);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  const expected = Buffer.from(hashS!, "base64url");
  const key = await scryptAsync(password, Buffer.from(saltS!, "base64url"), expected.length, {
    N,
    r,
    p,
    maxmem: maxmem(N, r),
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** A valid hash of a random password, used to equalise timing for unknown emails. */
let dummyHash: Promise<string> | undefined;
export function getDummyHash() {
  dummyHash ??= hashPassword(randomBytes(24).toString("base64url"));
  return dummyHash;
}
