/** O dia operacional da loja segue America/Manaus, independente do dispositivo. */
export function cashDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Manaus", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function cashDayBounds(start: string, end: string) {
  return [new Date(`${start}T00:00:00-04:00`).toISOString(), new Date(`${end}T23:59:59.999-04:00`).toISOString()] as const;
}
export function cashPreset(key: "today" | "yesterday" | "week" | "month", now = new Date()) {
  const end = new Date(`${cashDay(now)}T12:00:00Z`);
  const start = new Date(end);
  if (key === "yesterday") { start.setUTCDate(start.getUTCDate() - 1); end.setUTCDate(end.getUTCDate() - 1); }
  if (key === "week") start.setUTCDate(start.getUTCDate() - 6);
  if (key === "month") start.setUTCDate(1);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
export function cashPeriodBalance(rows: { method: string; direction: string; amount: number; accountId: string }[], accountId?: string) {
  return rows.filter(row => row.method === "CASH" && (!accountId || row.accountId === accountId)).reduce((sum, row) => sum + (row.direction === "IN" ? 1 : -1) * Math.round(row.amount * 100), 0) / 100;
}
