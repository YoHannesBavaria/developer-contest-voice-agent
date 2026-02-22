import { afterEach, describe, expect, it, vi } from "vitest";
import { createCalendarService } from "../../src/services/calendar.js";

describe("calcom calendar service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("books first available slot when no preferred slot was passed", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              "2026-02-23": [{ start: "2026-02-23T09:00:00.000+01:00" }]
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response("{}", { status: 201 }));

    const service = createCalendarService({
      NODE_ENV: "test",
      PORT: 3000,
      CALL_STORE_PROVIDER: "memory",
      DATABASE_URL: "",
      PUBLIC_BASE_URL: "http://localhost:3000",
      SAAS_PRODUCT_NAME: "PipelinePilot",
      DEMO_TIMEZONE: "Europe/Berlin",
      CALENDAR_PROVIDER: "calcom",
      CALCOM_API_KEY: "test-key",
      CALCOM_EVENT_TYPE_ID: 4829122,
      CALCOM_BASE_URL: "https://api.cal.com",
      CALCOM_API_VERSION: "2024-09-04",
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "gpt-4o-mini",
      TWILIO_ACCOUNT_SID: "",
      TWILIO_AUTH_TOKEN: "",
      TWILIO_PHONE_NUMBER: "",
      TWILIO_VALIDATE_SIGNATURE: false
    });

    const result = await service.bookDemo({
      callId: "call-1",
      timezone: "Europe/Berlin",
      attendeeName: "Max",
      attendeeEmail: "max@example.com"
    });

    expect(result.booked).toBe(true);
    expect(result.provider).toBe("calcom");
    expect(result.slotIso).toBe("2026-02-23T09:00:00.000+01:00");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns clear error when no slot is available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            "2026-02-23": []
          }
        }),
        { status: 200 }
      )
    );

    const service = createCalendarService({
      NODE_ENV: "test",
      PORT: 3000,
      CALL_STORE_PROVIDER: "memory",
      DATABASE_URL: "",
      PUBLIC_BASE_URL: "http://localhost:3000",
      SAAS_PRODUCT_NAME: "PipelinePilot",
      DEMO_TIMEZONE: "Europe/Berlin",
      CALENDAR_PROVIDER: "calcom",
      CALCOM_API_KEY: "test-key",
      CALCOM_EVENT_TYPE_ID: 4829122,
      CALCOM_BASE_URL: "https://api.cal.com",
      CALCOM_API_VERSION: "2024-08-13",
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "gpt-4o-mini",
      TWILIO_ACCOUNT_SID: "",
      TWILIO_AUTH_TOKEN: "",
      TWILIO_PHONE_NUMBER: "",
      TWILIO_VALIDATE_SIGNATURE: false
    });

    const result = await service.bookDemo({
      callId: "call-2",
      timezone: "Europe/Berlin",
      attendeeName: "Max",
      attendeeEmail: "max@example.com"
    });

    expect(result.booked).toBe(false);
    expect(result.reason).toContain("No available slots");
  });

  it("falls back booking API version when preferred one returns 404", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              "2026-02-23": [{ start: "2026-02-23T11:00:00.000+01:00" }]
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response("{}", { status: 404 }))
      .mockResolvedValueOnce(new Response("{}", { status: 201 }));

    const service = createCalendarService({
      NODE_ENV: "test",
      PORT: 3000,
      CALL_STORE_PROVIDER: "memory",
      DATABASE_URL: "",
      PUBLIC_BASE_URL: "http://localhost:3000",
      SAAS_PRODUCT_NAME: "PipelinePilot",
      DEMO_TIMEZONE: "Europe/Berlin",
      CALENDAR_PROVIDER: "calcom",
      CALCOM_API_KEY: "test-key",
      CALCOM_EVENT_TYPE_ID: 4829122,
      CALCOM_BASE_URL: "https://api.cal.com",
      CALCOM_API_VERSION: "2024-09-04",
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "gpt-4o-mini",
      TWILIO_ACCOUNT_SID: "",
      TWILIO_AUTH_TOKEN: "",
      TWILIO_PHONE_NUMBER: "",
      TWILIO_VALIDATE_SIGNATURE: false
    });

    const result = await service.bookDemo({
      callId: "call-3",
      timezone: "Europe/Berlin",
      attendeeName: "Max",
      attendeeEmail: "max@example.com"
    });

    expect(result.booked).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
