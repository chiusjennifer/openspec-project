export function minutesBetween(startAt: string | Date, endAt: string | Date): number {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    throw new Error("Invalid time range");
  }
  return Math.floor((end - start) / 60000);
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
