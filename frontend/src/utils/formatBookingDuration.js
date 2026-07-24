export function formatBookingDuration(startTime, endTime) {
  if (!startTime || !endTime) return 'Duration unavailable';

  const start = new Date(startTime);
  const end = new Date(endTime);
  const totalMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return 'Duration unavailable';

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];

  if (days > 0) parts.push(`${days} ${days === 1 ? 'Day' : 'Days'}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'Hour' : 'Hours'}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'Minute' : 'Minutes'}`);

  return parts.join(' ');
}
