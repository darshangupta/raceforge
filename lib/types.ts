export type PlanMode = '4lift' | '3lift';
export type WorkoutType = 'push' | 'pull' | 'legs' | 'shoulders' | 'easy_run' | 'quality_run' | 'long_run' | 'rest';
export type RunType = 'easy' | 'tempo' | 'intervals' | 'hills' | 'progression' | 'long';
export type QualityRunVariant = 'tempo' | 'intervals' | 'hills' | 'progression';

export interface DayWorkout {
  weekNumber: number;
  dayOfWeek: number;
  date: string;
  type: WorkoutType;
  label: string;
  runType?: RunType;
  qualityVariant?: QualityRunVariant;
  targetMiles?: number;
  completed: boolean;
}

export interface RunLog {
  workoutDate: string;
  distance: number;
  feel: number;
  loggedAt: string;
}

export interface LiftLog {
  workoutDate: string;
  completed: true;
  loggedAt: string;
}

export interface AppSettings {
  raceDate: string;
  trainingStart: string;
  planMode: PlanMode;
  units: 'mi' | 'km';
}

export interface StoredData {
  settings: AppSettings;
  runLogs: Record<string, RunLog>;
  liftLogs: Record<string, LiftLog>;
}
