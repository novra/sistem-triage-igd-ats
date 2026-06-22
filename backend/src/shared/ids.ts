import crypto from "crypto";

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}
