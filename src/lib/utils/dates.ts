import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
  isThisYear,
  parseISO,
} from 'date-fns';

export function formatDate(date: Date | string, formatString: string = 'PP'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
}

export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'PPp');
}

export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(dateObj)) {
    return `Today, ${format(dateObj, 'p')}`;
  }

  if (isYesterday(dateObj)) {
    return `Yesterday, ${format(dateObj, 'p')}`;
  }

  if (isThisWeek(dateObj)) {
    return format(dateObj, 'EEEE, p');
  }

  if (isThisMonth(dateObj)) {
    return format(dateObj, 'MMM d, p');
  }

  if (isThisYear(dateObj)) {
    return format(dateObj, 'MMM d');
  }

  return format(dateObj, 'PP');
}

export function formatTimeAgo(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function getMonthName(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMMM yyyy');
}

export function toISODateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function toISODateTimeString(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}
