export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Format currency with proper thousand separators and symbol
 * Output e.g. ৳10,000
 */
const currencyIntegers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const currencyDecimals = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatCurrency(amount: number, symbol: string = '৳'): string {
  const rounded = Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
  const formatted = (Number.isInteger(rounded) ? currencyIntegers : currencyDecimals).format(Math.abs(rounded));
  if (rounded < 0) {
    return `- ${symbol}${formatted}`;
  }
  return `${symbol}${formatted}`;
}

/**
 * Format date for UI relative or concise
 * e.g. "Today", "Yesterday", "Aug 5"
 */
export function formatDateLabel(dateString: string): string {
  if (!dateString) return '';
  const dateObj = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateString) ? `${dateString}T00:00:00` : dateString);
  if (isNaN(dateObj.getTime())) return dateString;

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday =
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear();

  const isYesterday =
    dateObj.getDate() === yesterday.getDate() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getFullYear() === yesterday.getFullYear();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  const monthName = MONTH_NAMES_SHORT[dateObj.getMonth()];
  const day = dateObj.getDate();
  return `${monthName} ${day}`;
}

/**
 * Get Month Name and Year
 * e.g. August 2026
 */
/**
 * Year options for month/year pickers. Always contains the currently selected
 * year so the <select> can never show a blank value.
 */
export function getYearOptions(selectedYear: number): number[] {
  return Array.from(new Set([2024, 2025, 2026, 2027, selectedYear])).sort((a, b) => a - b);
}

export function formatMonthYear(month: number, year: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}
