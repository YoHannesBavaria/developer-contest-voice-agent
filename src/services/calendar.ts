import type { AppConfig } from "../config.js";
import type { BookingResult } from "../domain/types.js";

export interface BookDemoInput {
  callId: string;
  timezone: string;
  preferredSlotIso?: string;
  attendeeName?: string;
  attendeeEmail?: string;
}

export interface CalendarService {
  bookDemo(input: BookDemoInput): Promise<BookingResult>;
}

export class MockCalendarService implements CalendarService {
  public async bookDemo(input: BookDemoInput): Promise<BookingResult> {
    const slotIso = input.preferredSlotIso ?? this.defaultSlot();
    return {
      booked: true,
      slotIso,
      provider: "mock"
    };
  }

  private defaultSlot(): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 1);
    date.setUTCHours(9, 0, 0, 0);
    return date.toISOString();
  }
}

interface CalComCalendarServiceOptions {
  apiKey: string;
  eventTypeId: number;
  baseUrl: string;
  apiVersion: string;
}

class CalComCalendarService implements CalendarService {
  public constructor(private readonly options: CalComCalendarServiceOptions) {}

  public async bookDemo(input: BookDemoInput): Promise<BookingResult> {
    const start = input.preferredSlotIso ?? this.defaultSlot();
    const payload = {
      start,
      eventTypeId: this.options.eventTypeId,
      attendee: {
        name: input.attendeeName ?? "Contest Lead",
        email: input.attendeeEmail ?? `${input.callId}@example.invalid`,
        timeZone: input.timezone
      },
      metadata: {
        callId: input.callId
      }
    };

    try {
      const response = await fetch(`${this.options.baseUrl}/v2/bookings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "cal-api-version": this.options.apiVersion,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const reason = await response.text();
        return {
          booked: false,
          provider: "calcom",
          reason: `Cal.com booking failed (${response.status}): ${reason}`
        };
      }

      return {
        booked: true,
        provider: "calcom",
        slotIso: start
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      return {
        booked: false,
        provider: "calcom",
        reason: `Cal.com request error: ${reason}`
      };
    }
  }

  private defaultSlot(): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 1);
    date.setUTCHours(9, 0, 0, 0);
    return date.toISOString();
  }
}

export function createCalendarService(config: AppConfig): CalendarService {
  if (config.CALENDAR_PROVIDER === "calcom") {
    if (!config.CALCOM_API_KEY || !config.CALCOM_EVENT_TYPE_ID) {
      return {
        async bookDemo(): Promise<BookingResult> {
          return {
            booked: false,
            provider: "calcom",
            reason: "Missing CALCOM_API_KEY or CALCOM_EVENT_TYPE_ID"
          };
        }
      };
    }

    return new CalComCalendarService({
      apiKey: config.CALCOM_API_KEY,
      eventTypeId: config.CALCOM_EVENT_TYPE_ID,
      baseUrl: config.CALCOM_BASE_URL,
      apiVersion: config.CALCOM_API_VERSION
    });
  }

  if (config.CALENDAR_PROVIDER === "mock") {
    return new MockCalendarService();
  }

  return {
    async bookDemo(): Promise<BookingResult> {
      return {
        booked: false,
        provider: config.CALENDAR_PROVIDER,
        reason: `${config.CALENDAR_PROVIDER} integration is not implemented yet.`
      };
    }
  };
}

