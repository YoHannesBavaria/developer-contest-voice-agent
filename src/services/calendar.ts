import type { AppConfig } from "../config.js";
import type { BookingResult } from "../domain/types.js";

const SLOT_LOOKAHEAD_DAYS = 14;
const SLOTS_MIN_API_VERSION = "2024-09-04";

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

interface CalComSlotsResponse {
  data?: Record<string, Array<{ start?: string }>>;
}

class CalComCalendarService implements CalendarService {
  public constructor(private readonly options: CalComCalendarServiceOptions) {}

  public async bookDemo(input: BookDemoInput): Promise<BookingResult> {
    const resolvedSlot = input.preferredSlotIso ?? (await this.findFirstAvailableSlot(input.timezone));
    if (!resolvedSlot) {
      return {
        booked: false,
        provider: "calcom",
        reason: "No available slots found for this event type."
      };
    }

    const booking = await this.createBooking(resolvedSlot, input);
    if (booking.ok) {
      return {
        booked: true,
        provider: "calcom",
        slotIso: resolvedSlot
      };
    }

    const reason = await booking.reason();
    return {
      booked: false,
      provider: "calcom",
      reason: `Cal.com booking failed (${booking.status}): ${reason}`
    };
  }

  private async findFirstAvailableSlot(timezone: string): Promise<string | undefined> {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 1);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + SLOT_LOOKAHEAD_DAYS);

    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    for (const apiVersion of this.slotApiVersions()) {
      const query = new URLSearchParams({
        eventTypeId: String(this.options.eventTypeId),
        start: startDate,
        end: endDate,
        timeZone: timezone
      });

      try {
        const response = await fetch(`${this.options.baseUrl}/v2/slots?${query.toString()}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.options.apiKey}`,
            "cal-api-version": apiVersion
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            continue;
          }
          return undefined;
        }

        const payload = (await response.json()) as CalComSlotsResponse;
        const candidates = Object.entries(payload.data ?? {})
          .sort(([a], [b]) => a.localeCompare(b))
          .flatMap(([, slots]) => slots)
          .map((slot) => slot.start)
          .filter((slot): slot is string => typeof slot === "string" && slot.length > 0);

        if (candidates.length > 0) {
          return candidates[0];
        }

        return undefined;
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  private async createBooking(start: string, input: BookDemoInput): Promise<{ ok: boolean; status: number; reason: () => Promise<string> }> {
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

      return {
        ok: response.ok,
        status: response.status,
        reason: async () => await response.text()
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      return {
        ok: false,
        status: 0,
        reason: async () => `Cal.com request error: ${reason}`
      };
    }
  }

  private slotApiVersions(): string[] {
    const preferred = this.options.apiVersion;
    if (preferred === SLOTS_MIN_API_VERSION) {
      return [preferred];
    }
    return [preferred, SLOTS_MIN_API_VERSION];
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
