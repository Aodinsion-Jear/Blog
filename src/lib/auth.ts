export const SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET 未设置或过短（至少 16 位）");
  }
  return secret;
}

function getPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    throw new Error("ADMIN_PASSWORD 未设置");
  }
  return pw;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  const b64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  const binary = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary");
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function hmac(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toBase64Url(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function signSession(): Promise<string> {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({ exp })));
  const sig = await hmac(getSecret(), payload);
  return `${payload}.${sig}`;
}

export async function verifySession(cookieValue: string | undefined): Promise<{ ok: boolean; exp?: number }> {
  if (!cookieValue) return { ok: false };
  const [payload, sig] = cookieValue.split(".");
  if (!payload || !sig) return { ok: false };
  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return { ok: false };
  }
  const expected = await hmac(secret, payload);
  if (!timingSafeEqual(sig, expected)) return { ok: false };
  try {
    const decoded = new TextDecoder().decode(fromBase64Url(payload));
    const parsed = JSON.parse(decoded) as { exp?: number };
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return { ok: false };
    return { ok: true, exp: parsed.exp };
  } catch {
    return { ok: false };
  }
}

export function verifyPassword(input: string): boolean {
  const expected = getPassword();
  const a = input ?? "";
  if (a.length !== expected.length) {
    timingSafeEqual(expected, expected);
    return false;
  }
  return timingSafeEqual(a, expected);
}

export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;
