import { format, parseISO } from 'date-fns';

/**
 * Formats a number as currency: $X.XX
 */
export function formatCurrency(amount: number): string {
  return `$${Math.abs(amount).toFixed(2)}`;
}

/**
 * Formats a date string (YYYY-MM-DD) into a human-readable format using date-fns.
 */
export function formatDate(date: string): string {
  return format(parseISO(date), 'MMM d, yyyy');
}
