export function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function todayDateInputValue(): string {
  return toDateInputValue(new Date())
}

export function dayRange(dateStr: string): { start: string; end: string } {
  const start = new Date(`${dateStr}T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function daysAgoInputValue(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toDateInputValue(d)
}
