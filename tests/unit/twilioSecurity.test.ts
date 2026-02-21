import { describe, expect, it } from "vitest";
import { computeTwilioSignature, isValidTwilioSignature } from "../../src/services/twilioSecurity.js";

describe("twilio signature validation", () => {
  it("accepts a valid signature", () => {
    const url = "https://example.com/api/providers/twilio/gather?callId=abc";
    const params = {
      CallSid: "CA123",
      SpeechResult: "Hallo"
    };
    const authToken = "secret-token";
    const signature = computeTwilioSignature(url, params, authToken);

    expect(
      isValidTwilioSignature({
        url,
        params,
        authToken,
        providedSignature: signature
      })
    ).toBeTruthy();
  });

  it("rejects an invalid signature", () => {
    expect(
      isValidTwilioSignature({
        url: "https://example.com/api/providers/twilio/voice",
        params: { CallSid: "CA999" },
        authToken: "secret-token",
        providedSignature: "invalid-signature"
      })
    ).toBeFalsy();
  });
});

