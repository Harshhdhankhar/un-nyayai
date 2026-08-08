import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateCsrfToken,
  verifyCsrfToken,
  validateUpload,
} from "@/lib/security";

describe("password hashing", () => {
  it("hashes and verifies a password", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct");
    expect(verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(verifyPassword("wrong password", hash)).toBe(false);
  });

  it("uses a random salt per hash", () => {
    const a = hashPassword("same-pass");
    const b = hashPassword("same-pass");
    expect(a).not.toBe(b);
  });
});

describe("CSRF tokens", () => {
  it("round-trips valid tokens", () => {
    const token = generateCsrfToken("secret", "session-1");
    expect(verifyCsrfToken("secret", "session-1", token)).toBe(true);
  });

  it("rejects tokens for other sessions", () => {
    const token = generateCsrfToken("secret", "session-1");
    expect(verifyCsrfToken("secret", "session-2", token)).toBe(false);
  });

  it("rejects tampered or missing tokens", () => {
    const token = generateCsrfToken("secret", "session-1");
    expect(verifyCsrfToken("secret", "session-1", `${token}x`)).toBe(false);
    expect(verifyCsrfToken("secret", "session-1", undefined)).toBe(false);
    expect(verifyCsrfToken("secret", "session-1", "garbage")).toBe(false);
  });
});

describe("validateUpload", () => {
  it("allows PDFs", () => {
    expect(validateUpload({ type: "application/pdf", size: 1000 }).ok).toBe(true);
  });

  it("rejects unknown types", () => {
    expect(validateUpload({ type: "application/x-executable", size: 1000 }).ok).toBe(false);
  });

  it("rejects oversized files", () => {
    const ok = validateUpload({ type: "application/pdf", size: 16 * 1024 * 1024 });
    expect(ok.ok).toBe(false);
  });
});
