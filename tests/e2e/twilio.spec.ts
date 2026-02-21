import { expect, test } from "@playwright/test";

test("twilio inbound webhook responds with TwiML gather", async ({ request }) => {
  const response = await request.post("/api/providers/twilio/voice", {
    form: {
      CallSid: "CA1234567890",
      From: "+49123456789"
    }
  });

  expect(response.ok()).toBeTruthy();
  const twiml = await response.text();
  expect(twiml).toContain("<Response>");
  expect(twiml).toContain("<Gather");
  expect(twiml).toContain("/api/providers/twilio/gather?callId=CA1234567890");
});

