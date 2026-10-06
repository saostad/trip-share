import { format, parseISO } from 'date-fns';

const groupedTwoDecimals = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a number as currency: $X.XX with thousands separators.
 * Callers show direction in words, so the value is always non-negative.
 */
export function formatCurrency(amount: number): string {
  return `$${groupedTwoDecimals.format(Math.abs(amount))}`;
}

/**
 * Formats a date string (YYYY-MM-DD) into a human-readable format using date-fns.
 */
export function formatDate(date: string): string {
  return format(parseISO(date), 'MMM d, yyyy');
}
