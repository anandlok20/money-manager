import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { Frequency } from '@/types';

export function calculateNextRunDate(currentDate: Date, frequency: Frequency): Date {
  switch (frequency) {
    case Frequency.DAILY:
      return addDays(currentDate, 1);
    case Frequency.WEEKLY:
      return addWeeks(currentDate, 1);
    case Frequency.MONTHLY:
      return addMonths(currentDate, 1);
    case Frequency.QUARTERLY:
      return addMonths(currentDate, 3);
    case Frequency.YEARLY:
      return addYears(currentDate, 1);
    default:
      return addMonths(currentDate, 1);
  }
}
