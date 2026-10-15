import { Lang } from './route-table';

/**
 * "grudnia 2026" / "December 2026" for "od {date}" / "from {date}". Polish needs the genitive month, which Intl
 * only produces next to a day, so the date is formatted with its day and the day is dropped.
 */
export function monthYear(isoDate: string, lang: Lang): string {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat(lang === 'pl' ? 'pl-PL' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatToParts(date);
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  return `${month} ${year}`;
}

/** True when the ISO date (yyyy-mm-dd) is after today. */
export function isFutureDate(isoDate: string, today: Date = new Date()): boolean {
  return isoDate.slice(0, 10) > today.toISOString().slice(0, 10);
}
