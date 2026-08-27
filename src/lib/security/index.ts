import "server-only";
import crypto from "node:crypto";
import { z } from "zod";

/**
 * Shared security helpers: hashing, safe errors, headers, CSRF tokens.
 */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(candidate, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Wrap an API route handler so errors never leak internals to clients. */
export function safeHandler(
  handler: (req: Request, ctx: unknown) => Promise<Response>
) {
  return async (req: Request, ctx: unknown): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      const isZod = err instanceof z.ZodError;
      const status = isZod ? 400 : 500;
      const message = isZod
        ? "Invalid request data."
        : "Something went wrong. Please try again.";
      console.error(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: "error",
          msg: "api_error",
          error: err instanceof Error ? err.message : String(err),
        })
      );
      return Response.json(
        { ok: false, error: message, details: isZod ? err.flatten() : undefined },
        { status }
      );
    }
  };
}

export const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "0",
};

export function generateCsrfToken(secret: string, sessionId: string): string {
  const payload = `${sessionId}.${crypto.randomBytes(16).toString("hex")}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyCsrfToken(
  secret: string,
  sessionId: string,
  token: string | undefined | null
): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [sid, _nonce, sig] = parts;
  if (sid !== sessionId) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${sid}.${_nonce}`)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Allowed upload types and sizes (server-side validation). */
export const allowedUploadMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
]);

export const maxUploadBytes = 15 * 1024 * 1024; // 15MB

export function validateUpload(file: { type: string; size: number; name?: string }) {
  const isAllowedExt = file.name ? /\.(pdf|docx|doc|txt|png|jpe?g|webp)$/i.test(file.name) : false;
  const isAllowedMime = allowedUploadMimeTypes.has(file.type);

  if (!isAllowedMime && !isAllowedExt) {
    return { ok: false as const, error: "Unsupported file format. Please upload PDF, DOCX, TXT or image files." };
  }
  if (file.size > maxUploadBytes) {
    return { ok: false as const, error: "File is too large (maximum size is 15MB)." };
  }
  return { ok: true as const };
}

/** Sanitize free-text input (strip control characters). */
export function sanitizeText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
}
