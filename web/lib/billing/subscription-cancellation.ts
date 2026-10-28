type SubscriptionCancellationInput = {
  status?: string | null;
  cancelAt?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  currentPeriodEnd?: string | null;
};

export function getSubscriptionCancellation({
  status,
  cancelAt,
  cancelAtPeriodEnd,
  currentPeriodEnd,
}: SubscriptionCancellationInput) {
  const hasEnded = status === "canceled" || status === "incomplete_expired";
  // Stripe's flexible billing portal sets cancel_at without cancel_at_period_end.
  const scheduled = !hasEnded && Boolean(cancelAt || cancelAtPeriodEnd);

  return {
    scheduled,
    date: scheduled ? cancelAt || currentPeriodEnd || null : null,
  };
}
