export function getPaymentAvailability(startTime, now = new Date()) {
  if (!startTime) {
    return { allowed: false, label: 'Date unavailable', message: 'Booking date is not available.' };
  }

  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) {
    return { allowed: false, label: 'Date unavailable', message: 'Booking date is invalid.' };
  }

  const bookingDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (today < bookingDay) {
    const dateLabel = start.toLocaleDateString([], { day: '2-digit', month: 'short' });
    return {
      allowed: false,
      label: `Pay on ${dateLabel}`,
      message: `Payment will be available on ${start.toLocaleDateString()} before the parking start time.`,
    };
  }

  if (now >= start) {
    return {
      allowed: false,
      label: 'Payment closed',
      message: 'Payment is no longer available because the parking start time has passed.',
    };
  }

  return { allowed: true, label: 'Pay Now', message: '' };
}
