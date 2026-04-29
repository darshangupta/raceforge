import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, RunLog, LiftLog, StoredData } from './types';

const KEYS = {
  settings: 'raceforge:settings',
  runLogs: 'raceforge:run_logs',
  liftLogs: 'raceforge:lift_logs',
};

export const DEFAULT_SETTINGS: AppSettings = {
  raceDate: '2026-10-25',
  trainingStart: '2026-06-07',
  planMode: '4lift',
  units: 'mi',
};

export async function getSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(KEYS.settings);
  return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

export async function getRunLogs(): Promise<Record<string, RunLog>> {
  const raw = await AsyncStorage.getItem(KEYS.runLogs);
  return raw ? JSON.parse(raw) : {};
}

export async function saveRunLog(log: RunLog): Promise<void> {
  const logs = await getRunLogs();
  logs[log.workoutDate] = log;
  await AsyncStorage.setItem(KEYS.runLogs, JSON.stringify(logs));
}

export async function getLiftLogs(): Promise<Record<string, LiftLog>> {
  const raw = await AsyncStorage.getItem(KEYS.liftLogs);
  return raw ? JSON.parse(raw) : {};
}

export async function saveLiftLog(log: LiftLog): Promise<void> {
  const logs = await getLiftLogs();
  logs[log.workoutDate] = log;
  await AsyncStorage.setItem(KEYS.liftLogs, JSON.stringify(logs));
}

export async function getAllData(): Promise<StoredData> {
  const [settings, runLogs, liftLogs] = await Promise.all([
    getSettings(), getRunLogs(), getLiftLogs(),
  ]);
  return { settings, runLogs, liftLogs };
}
