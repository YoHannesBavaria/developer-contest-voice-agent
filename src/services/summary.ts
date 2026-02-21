import type { BookingResult, CallSummary, LeadQualificationInput, LeadScore } from "../domain/types.js";

interface SummaryInput {
  productName: string;
  qualification: LeadQualificationInput;
  leadScore: LeadScore;
  booking: BookingResult;
}

export function buildSummary(input: SummaryInput): CallSummary {
  const bookingLine = input.booking.booked
    ? `Demo gebucht fuer ${input.booking.slotIso}.`
    : `Keine Demo gebucht (${input.booking.reason ?? "kein Grund angegeben"}).`;

  return {
    summaryText: [
      `Lead interessiert an ${input.productName} fuer Use Case: ${input.qualification.useCase}.`,
      `Pain Point: ${input.qualification.painPoint}.`,
      `Lead Score: ${input.leadScore.grade} (${input.leadScore.numeric}/100).`,
      bookingLine
    ].join(" "),
    nextSteps: input.booking.booked
      ? ["Demo vorbereiten", "Use-Case-Deck auf Bedarf zuschneiden", "Follow-up E-Mail versenden"]
      : ["Einwand analysieren", "Alternative Offer senden", "Follow-up in 7 Tagen"]
  };
}

