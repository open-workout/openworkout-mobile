export function formatDayOfWeek(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: 'long' });
}

export function formatShortDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export function formatTodayLabel(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' });
}
