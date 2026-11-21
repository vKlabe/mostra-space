export const BLACK_WEEK_START_AT = Date.parse("2026-11-21T00:00:00+01:00");
export const BLACK_WEEK_END_AT = Date.parse("2026-12-01T00:00:00+01:00");
export const BLACK_WEEK_MONTHS = 3;

export const BLACK_WEEK_OFFERS = {
  pro: { regularCents: 1490, offerCents: 990 },
  business: { regularCents: 2490, offerCents: 1690 },
} as const;

export type BlackWeekPlan = keyof typeof BLACK_WEEK_OFFERS;

export function getBlackWeekPhase(now = Date.now()) {
  return now >= BLACK_WEEK_START_AT && now < BLACK_WEEK_END_AT ? "active" : "inactive";
}
