import type { BookingResult } from "../domain/types.js";

export interface BookDemoInput {
  callId: string;
  timezone: string;
  preferredSlotIso?: string;
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

export function createCalendarService(provider: string): CalendarService {
  if (provider !== "mock") {
    return {
      async bookDemo(): Promise<BookingResult> {
        return {
          booked: false,
          provider,
          reason: `${provider} integration is not implemented in the starter yet.`
        };
      }
    };
  }

  return new MockCalendarService();
}

