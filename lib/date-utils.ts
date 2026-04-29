import { differenceInDays, addDays, format, parseISO } from 'date-fns';

export function daysUntilRace(raceDate: string): number {
  return differenceInDays(parseISO(raceDate), new Date());
}

export function currentTrainingWeek(trainingStart: string): number {
  const start = parseISO(trainingStart);
  const today = new Date();
  if (today < start) return 0;
  return Math.floor(differenceInDays(today, start) / 7) + 1;
}

export function isoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function trainingWeekDates(trainingStart: string, weekNumber: number): Date[] {
  const start = parseISO(trainingStart);
  const weekStart = addDays(start, (weekNumber - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}
