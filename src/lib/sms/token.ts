import { createHash, randomBytes } from "node:crypto";

/** A fresh secret the Shortcut will send. Shown to the user once. */
export function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Only the hash is stored; the plaintext token lives in the user's Shortcut. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}
