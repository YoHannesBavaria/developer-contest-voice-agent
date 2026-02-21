import { createHmac, timingSafeEqual } from "node:crypto";

export function computeTwilioSignature(url: string, params: Record<string, string>, authToken: string): string {
  const sortedKeys = Object.keys(params).sort((a, b) => a.localeCompare(b));
  const payload = sortedKeys.reduce((acc, key) => acc + key + (params[key] ?? ""), url);
  return createHmac("sha1", authToken).update(payload, "utf8").digest("base64");
}

export function isValidTwilioSignature(input: {
  url: string;
  params: Record<string, string>;
  authToken: string;
  providedSignature?: string;
}): boolean {
  if (!input.providedSignature) {
    return false;
  }

  const expected = computeTwilioSignature(input.url, input.params, input.authToken);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(input.providedSignature, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

