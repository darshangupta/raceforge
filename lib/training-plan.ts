import { addDays, parseISO, format } from 'date-fns';
import { DayWorkout, PlanMode, QualityRunVariant, WorkoutType } from './types';

const LONG_RUN_MILES = [5,6,7,5, 8,9,10,7, 12,13,15,10, 17,18,20,14, 10,8,5,0];

const QUALITY_ROTATION: QualityRunVariant[] = ['tempo','intervals','hills','progression'];

const FOUR_LIFT_TEMPLATE: { type: WorkoutType; label: string }[] = [
  { type: 'push',        label: 'Push + Easy Run' },
  { type: 'pull',        label: 'Pull' },
  { type: 'quality_run', label: 'Quality Run' },
  { type: 'legs',        label: 'Legs' },
  { type: 'shoulders',   label: 'Shoulders & Arms' },
  { type: 'long_run',    label: 'Long Run' },
  { type: 'rest',        label: 'Rest / Mobility' },
];

const THREE_LIFT_TEMPLATE: { type: WorkoutType; label: string }[] = [
  { type: 'push',        label: 'Push + Easy Run' },
  { type: 'pull',        label: 'Pull' },
  { type: 'quality_run', label: 'Quality Run' },
  { type: 'legs',        label: 'Legs' },
  { type: 'rest',        label: 'Rest' },
  { type: 'long_run',    label: 'Long Run' },
  { type: 'rest',        label: 'Rest / Mobility' },
];

export function generateWeekWorkouts(
  trainingStart: string,
  weekNumber: number,
  planMode: PlanMode,
  qualityIndex: number
): DayWorkout[] {
  const template = planMode === '4lift' ? FOUR_LIFT_TEMPLATE : THREE_LIFT_TEMPLATE;
  const startDate = parseISO(trainingStart);
  const weekStartDate = addDays(startDate, (weekNumber - 1) * 7);
  const longRunMiles = LONG_RUN_MILES[weekNumber - 1] ?? 0;
  const variant = QUALITY_ROTATION[qualityIndex % 4];

  return template.map((day, i) => {
    const date = addDays(weekStartDate, i);
    const isoDateStr = format(date, 'yyyy-MM-dd');

    let targetMiles: number | undefined;
    let runType: DayWorkout['runType'] = undefined;

    if (day.type === 'long_run') {
      targetMiles = longRunMiles;
      runType = 'long';
    } else if (day.type === 'push') {
      runType = 'easy';
      targetMiles = weekNumber <= 8 ? 4 : weekNumber <= 14 ? 5 : 6;
    } else if (day.type === 'quality_run') {
      runType = variant;
      targetMiles = weekNumber <= 8 ? 5 : weekNumber <= 14 ? 6 : 7;
    }

    let label = day.label;
    if (day.type === 'quality_run') {
      label = `${variant.charAt(0).toUpperCase() + variant.slice(1)} Run`;
    }
    if (day.type === 'long_run' && weekNumber === 20) {
      label = 'Race Day';
    }

    return {
      weekNumber,
      dayOfWeek: i,
      date: isoDateStr,
      type: day.type,
      label,
      runType,
      qualityVariant: variant,
      targetMiles,
      completed: false,
    };
  });
}

export function generateFullPlan(trainingStart: string, planMode: PlanMode): DayWorkout[] {
  const allWorkouts: DayWorkout[] = [];
  for (let week = 1; week <= 20; week++) {
    allWorkouts.push(...generateWeekWorkouts(trainingStart, week, planMode, (week - 1) % 4));
  }
  return allWorkouts;
}

export function getTodayWorkout(trainingStart: string, planMode: PlanMode): DayWorkout | null {
  const today = format(new Date(), 'yyyy-MM-dd');
  const plan = generateFullPlan(trainingStart, planMode);
  return plan.find(w => w.date === today) ?? null;
}

export function getWeekWorkouts(trainingStart: string, planMode: PlanMode, weekNumber: number): DayWorkout[] {
  return generateWeekWorkouts(trainingStart, weekNumber, planMode, (weekNumber - 1) % 4);
}
