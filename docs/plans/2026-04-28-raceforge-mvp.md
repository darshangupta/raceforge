# RaceForge MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local-only Expo Go mobile app that shows today's hybrid training workout, lets you log runs (distance + feel) and mark lifts done, displays the 20-week schedule, and tracks progress.

**Architecture:** All data persists via AsyncStorage on-device — no backend, no auth. Training plan is generated deterministically from race date + start date. Four tab screens: Today / Log / Schedule / Progress.

**Tech Stack:** Expo SDK 52, React Native, TypeScript, Expo Router v4, AsyncStorage, date-fns, react-native-svg + victory-native for charts.

**Defaults:** Race Day Oct 25 2026, Training Start Jun 7 2026, Plan Mode 4-lift/3-run.

---

## Task 1: Scaffold Expo Project + Git

**Files:**
- Create: `raceforge/` (Expo project root)

**Step 1: Create Expo project**

```bash
cd /Users/darshangupta/dev
# The raceforge dir already exists, scaffold into it
npx create-expo-app@latest raceforge --template blank-typescript
```

Wait — `raceforge/` dir already exists. Instead:

```bash
cd /Users/darshangupta/dev/raceforge
npx create-expo-app@latest . --template blank-typescript
```

**Step 2: Install dependencies**

```bash
cd /Users/darshangupta/dev/raceforge
npx expo install expo-router @react-native-async-storage/async-storage date-fns react-native-svg
npx expo install victory-native
npm install --save-dev @types/react
```

**Step 3: Init git + first commit**

```bash
cd /Users/darshangupta/dev/raceforge
git init
echo "node_modules/\n.expo/\ndist/\n*.log" > .gitignore
git add .
git commit -m "feat: scaffold Expo project"
```

**Step 4: Create GitHub repo and push**

```bash
gh repo create raceforge --public --source=. --remote=origin --push
```

---

## Task 2: Project Structure + Theme

**Files:**
- Create: `constants/theme.ts`
- Create: `lib/types.ts`
- Modify: `app/_layout.tsx`

**Step 1: Create theme constants**

```typescript
// constants/theme.ts
export const Colors = {
  bg: '#0A0A0A',
  surface: '#141414',
  card: '#1C1C1C',
  border: '#2A2A2A',
  primary: '#E8F44A',      // acid yellow — athlete energy
  primaryDim: '#B5BE2E',
  run: '#4AF4A0',           // green for runs
  lift: '#4A9EF4',          // blue for lifts
  rest: '#555555',
  text: '#FFFFFF',
  textMuted: '#888888',
  textDim: '#555555',
  danger: '#F44A4A',
  success: '#4AF4A0',
};

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 24,
};

export const FontSize = {
  xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 28, hero: 48,
};
```

**Step 2: Create types**

```typescript
// lib/types.ts
export type PlanMode = '4lift' | '3lift';
export type WorkoutType = 'push' | 'pull' | 'legs' | 'shoulders' | 'easy_run' | 'quality_run' | 'long_run' | 'rest';
export type RunType = 'easy' | 'tempo' | 'intervals' | 'hills' | 'progression' | 'long';
export type QualityRunVariant = 'tempo' | 'intervals' | 'hills' | 'progression';

export interface DayWorkout {
  weekNumber: number;
  dayOfWeek: number; // 0=Sun, 1=Mon ... 6=Sat
  date: string;      // ISO yyyy-MM-dd
  type: WorkoutType;
  label: string;
  runType?: RunType;
  qualityVariant?: QualityRunVariant;
  targetMiles?: number; // for runs
  completed: boolean;
}

export interface RunLog {
  workoutDate: string; // ISO date, used as key
  distance: number;
  feel: number; // 1-10
  loggedAt: string; // ISO timestamp
}

export interface LiftLog {
  workoutDate: string;
  completed: true;
  loggedAt: string;
}

export interface AppSettings {
  raceDate: string;       // ISO date
  trainingStart: string;  // ISO date
  planMode: PlanMode;
  units: 'mi' | 'km';
}

export interface StoredData {
  settings: AppSettings;
  runLogs: Record<string, RunLog>;   // keyed by ISO date
  liftLogs: Record<string, LiftLog>; // keyed by ISO date
}
```

**Step 3: Commit**

```bash
git add constants/ lib/types.ts
git commit -m "feat: add theme constants and TypeScript types"
```

---

## Task 3: Training Plan Logic

**Files:**
- Create: `lib/training-plan.ts`
- Create: `lib/date-utils.ts`

**Step 1: Create date utilities**

```typescript
// lib/date-utils.ts
import { differenceInDays, addDays, startOfWeek, format, parseISO, isToday } from 'date-fns';

export function daysUntilRace(raceDate: string): number {
  return differenceInDays(parseISO(raceDate), new Date());
}

export function currentTrainingWeek(trainingStart: string): number {
  const start = parseISO(trainingStart);
  const today = new Date();
  if (today < start) return 0; // not started
  return Math.floor(differenceInDays(today, start) / 7) + 1;
}

export function isoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function trainingWeekDates(trainingStart: string, weekNumber: number): Date[] {
  // Returns Mon-Sun dates for given week (1-indexed)
  const start = parseISO(trainingStart);
  const weekStart = addDays(start, (weekNumber - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}
```

**Step 2: Long run progression data**

```typescript
// lib/training-plan.ts
import { addDays, parseISO, format } from 'date-fns';
import { DayWorkout, PlanMode, QualityRunVariant, WorkoutType } from './types';

const LONG_RUN_MILES = [5,6,7,5, 8,9,10,7, 12,13,15,10, 17,18,20,14, 10,8,5,0];
// Index = weekNumber - 1. Week 20 = race (0 planned miles, just race)

const QUALITY_ROTATION: QualityRunVariant[] = ['tempo','intervals','hills','progression'];
```

**Step 3: 4-lift weekly template**

```typescript
// Day schedule: index 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
const FOUR_LIFT_TEMPLATE: { type: WorkoutType; label: string }[] = [
  { type: 'push',         label: 'Push + Easy Run' },
  { type: 'pull',         label: 'Pull' },
  { type: 'quality_run',  label: 'Quality Run' },
  { type: 'legs',         label: 'Legs' },
  { type: 'shoulders',    label: 'Shoulders & Arms' },
  { type: 'long_run',     label: 'Long Run' },
  { type: 'rest',         label: 'Rest / Mobility' },
];

const THREE_LIFT_TEMPLATE: { type: WorkoutType; label: string }[] = [
  { type: 'push',         label: 'Push + Easy Run' },
  { type: 'pull',         label: 'Pull' },
  { type: 'quality_run',  label: 'Quality Run' },
  { type: 'legs',         label: 'Legs' },
  { type: 'rest',         label: 'Rest' },
  { type: 'long_run',     label: 'Long Run' },
  { type: 'rest',         label: 'Rest / Mobility' },
];
```

**Step 4: Plan generator function**

```typescript
export function generateWeekWorkouts(
  trainingStart: string,
  weekNumber: number,
  planMode: PlanMode,
  qualityIndex: number // pass (weekNumber - 1) % 4
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
    let runType = undefined;

    if (day.type === 'long_run') {
      targetMiles = longRunMiles;
      runType = 'long' as const;
    } else if (day.type === 'easy_run' || day.type === 'push') {
      // Monday = push + easy run
      runType = 'easy' as const;
      targetMiles = weekNumber <= 8 ? 4 : weekNumber <= 14 ? 5 : 6;
    } else if (day.type === 'quality_run') {
      runType = variant === 'tempo' ? 'tempo' as const :
                variant === 'intervals' ? 'intervals' as const :
                variant === 'hills' ? 'hills' as const : 'progression' as const;
      targetMiles = weekNumber <= 8 ? 5 : weekNumber <= 14 ? 6 : 7;
    }

    let label = day.label;
    if (day.type === 'quality_run') {
      label = `${variant.charAt(0).toUpperCase() + variant.slice(1)} Run`;
    }
    if (day.type === 'long_run' && weekNumber === 20) {
      label = '🏁 Race Day';
    }

    return {
      weekNumber,
      dayOfWeek: i, // 0=Mon
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
    const weekWorkouts = generateWeekWorkouts(trainingStart, week, planMode, (week - 1) % 4);
    allWorkouts.push(...weekWorkouts);
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
```

**Step 5: Commit**

```bash
git add lib/
git commit -m "feat: training plan generation logic + date utils"
```

---

## Task 4: Storage Service

**Files:**
- Create: `lib/storage.ts`

**Step 1: Write storage wrapper**

```typescript
// lib/storage.ts
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
    getSettings(), getRunLogs(), getLiftLogs()
  ]);
  return { settings, runLogs, liftLogs };
}
```

**Step 2: Commit**

```bash
git add lib/storage.ts
git commit -m "feat: AsyncStorage service"
```

---

## Task 5: Root Layout + Tab Navigation

**Files:**
- Modify: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/index.tsx` (stub)
- Create: `app/(tabs)/log.tsx` (stub)
- Create: `app/(tabs)/schedule.tsx` (stub)
- Create: `app/(tabs)/progress.tsx` (stub)

**Step 1: Root layout**

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
```

**Step 2: Tabs layout**

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <Ionicons name={name} size={22} color={focused ? Colors.primary : Colors.textDim} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textDim,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'today' : 'today-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'add-circle' : 'add-circle-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'bar-chart' : 'bar-chart-outline'} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
```

**Step 3: Stub screens (just return colored View)**

Each stub:
```typescript
import { View, Text } from 'react-native';
import { Colors } from '../../constants/theme';

export default function TodayScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: Colors.text }}>Today</Text>
    </View>
  );
}
```

**Step 4: Verify app launches in Expo Go**

```bash
cd /Users/darshangupta/dev/raceforge
npx expo start
```

Scan QR with Expo Go on iPhone. Should show dark tab bar with 4 tabs.

**Step 5: Commit**

```bash
git add app/
git commit -m "feat: tab navigation shell, dark theme"
git push
```

---

## Task 6: Reusable UI Components

**Files:**
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/Button.tsx`
- Create: `components/ui/WorkoutTypePill.tsx`

**Step 1: Card**

```typescript
// components/ui/Card.tsx
import { View, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: Props) {
  return (
    <View style={[{
      backgroundColor: Colors.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: Colors.border,
    }, style]}>
      {children}
    </View>
  );
}
```

**Step 2: Badge**

```typescript
// components/ui/Badge.tsx
import { View, Text } from 'react-native';
import { Colors, Radius, Spacing, FontSize } from '../../constants/theme';

interface Props {
  label: string;
  color?: string;
}

export function Badge({ label, color = Colors.primary }: Props) {
  return (
    <View style={{
      backgroundColor: color + '22',
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ color, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
```

**Step 3: Button**

```typescript
// components/ui/Button.tsx
import { TouchableOpacity, Text, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing, FontSize } from '../../constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: ViewStyle;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', style, disabled }: Props) {
  const bg = variant === 'primary' ? Colors.primary
           : variant === 'danger' ? Colors.danger
           : 'transparent';
  const textColor = variant === 'primary' ? Colors.bg : Colors.text;
  const border = variant === 'ghost' ? { borderWidth: 1, borderColor: Colors.border } : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[{
        backgroundColor: bg,
        borderRadius: Radius.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
        opacity: disabled ? 0.4 : 1,
        ...border,
      }, style]}
    >
      <Text style={{ color: textColor, fontSize: FontSize.md, fontWeight: '700' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
```

**Step 4: WorkoutTypePill**

```typescript
// components/ui/WorkoutTypePill.tsx
import { Badge } from './Badge';
import { Colors } from '../../constants/theme';
import { WorkoutType } from '../../lib/types';

const TYPE_CONFIG: Record<WorkoutType, { label: string; color: string }> = {
  push:        { label: 'Push',       color: Colors.lift },
  pull:        { label: 'Pull',       color: Colors.lift },
  legs:        { label: 'Legs',       color: Colors.lift },
  shoulders:   { label: 'Shoulders',  color: Colors.lift },
  easy_run:    { label: 'Easy Run',   color: Colors.run },
  quality_run: { label: 'Run',        color: Colors.run },
  long_run:    { label: 'Long Run',   color: Colors.run },
  rest:        { label: 'Rest',       color: Colors.rest },
};

export function WorkoutTypePill({ type }: { type: WorkoutType }) {
  const { label, color } = TYPE_CONFIG[type];
  return <Badge label={label} color={color} />;
}
```

**Step 5: Commit**

```bash
git add components/
git commit -m "feat: reusable UI components (Card, Badge, Button, WorkoutTypePill)"
git push
```

---

## Task 7: Today Screen

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Create: `components/today/CountdownBanner.tsx`
- Create: `components/today/TodayWorkoutCard.tsx`
- Create: `components/today/WeekSummary.tsx`

**Step 1: CountdownBanner**

```typescript
// components/today/CountdownBanner.tsx
import { View, Text } from 'react-native';
import { Colors, FontSize, Spacing } from '../../constants/theme';
import { daysUntilRace, currentTrainingWeek } from '../../lib/date-utils';
import { AppSettings } from '../../lib/types';

export function CountdownBanner({ settings }: { settings: AppSettings }) {
  const days = daysUntilRace(settings.raceDate);
  const week = currentTrainingWeek(settings.trainingStart);

  return (
    <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg }}>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ color: Colors.primary, fontSize: FontSize.hero, fontWeight: '800' }}>{days}</Text>
        <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600', letterSpacing: 1 }}>DAYS TO RACE</Text>
      </View>
      <View style={{ width: 1, backgroundColor: Colors.border }} />
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ color: Colors.text, fontSize: FontSize.hero, fontWeight: '800' }}>
          {week > 0 ? week : '—'}
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600', letterSpacing: 1 }}>
          {week > 0 ? 'WEEK' : 'NOT STARTED'}
        </Text>
      </View>
    </View>
  );
}
```

**Step 2: TodayWorkoutCard**

```typescript
// components/today/TodayWorkoutCard.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { Card } from '../ui/Card';
import { WorkoutTypePill } from '../ui/WorkoutTypePill';
import { Button } from '../ui/Button';
import { Colors, FontSize, Spacing } from '../../constants/theme';
import { DayWorkout } from '../../lib/types';

interface Props {
  workout: DayWorkout;
  completed: boolean;
  onNavigateToLog: () => void;
}

export function TodayWorkoutCard({ workout, completed, onNavigateToLog }: Props) {
  const isRun = ['easy_run', 'quality_run', 'long_run', 'push'].includes(workout.type) && workout.runType;
  const isLift = ['push','pull','legs','shoulders'].includes(workout.type);
  const isRest = workout.type === 'rest';

  return (
    <Card style={{ marginBottom: Spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm }}>
        <WorkoutTypePill type={workout.type} />
        {completed && (
          <Text style={{ color: Colors.success, fontSize: FontSize.sm, fontWeight: '700' }}>✓ DONE</Text>
        )}
      </View>

      <Text style={{ color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', marginVertical: Spacing.sm }}>
        {workout.label}
      </Text>

      {workout.targetMiles && (
        <Text style={{ color: Colors.textMuted, fontSize: FontSize.md }}>
          Target: {workout.targetMiles} mi
        </Text>
      )}

      {!isRest && !completed && (
        <Button
          label={isRun ? 'Log Run' : 'Mark Done'}
          onPress={onNavigateToLog}
          style={{ marginTop: Spacing.md }}
        />
      )}
    </Card>
  );
}
```

**Step 3: Today screen**

```typescript
// app/(tabs)/index.tsx
import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors, Spacing, FontSize } from '../../constants/theme';
import { getAllData } from '../../lib/storage';
import { getTodayWorkout } from '../../lib/training-plan';
import { AppSettings, DayWorkout } from '../../lib/types';
import { DEFAULT_SETTINGS } from '../../lib/storage';
import { CountdownBanner } from '../../components/today/CountdownBanner';
import { TodayWorkoutCard } from '../../components/today/TodayWorkoutCard';
import { format } from 'date-fns';

export default function TodayScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [todayWorkout, setTodayWorkout] = useState<DayWorkout | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  async function loadData() {
    const data = await getAllData();
    setSettings(data.settings);
    const workout = getTodayWorkout(data.settings.trainingStart, data.settings.planMode);
    setTodayWorkout(workout);

    if (workout) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const isRunDay = workout.runType != null;
      const done = isRunDay
        ? !!data.runLogs[today]
        : !!data.liftLogs[today];
      setCompleted(done);
    }
    setLoading(false);
  }

  const today = format(new Date(), 'EEEE, MMMM d');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600', letterSpacing: 1, marginBottom: Spacing.xs }}>
          {today.toUpperCase()}
        </Text>
        <Text style={{ color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.xl }}>
          RaceForge
        </Text>

        {!loading && <CountdownBanner settings={settings} />}

        {loading ? (
          <Text style={{ color: Colors.textMuted }}>Loading...</Text>
        ) : todayWorkout ? (
          <TodayWorkoutCard
            workout={todayWorkout}
            completed={completed}
            onNavigateToLog={() => router.push('/log')}
          />
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: Spacing.xxl }}>
            <Text style={{ color: Colors.textMuted, fontSize: FontSize.lg }}>Training starts June 7, 2026</Text>
            <Text style={{ color: Colors.textDim, fontSize: FontSize.md, marginTop: Spacing.sm }}>Keep lifting. See you at the start line.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

**Step 4: Commit**

```bash
git add app/(tabs)/index.tsx components/today/
git commit -m "feat: Today screen with countdown + workout card"
git push
```

---

## Task 8: Log Screen

**Files:**
- Modify: `app/(tabs)/log.tsx`

**Step 1: Log screen with conditional form**

```typescript
// app/(tabs)/log.tsx
import { View, Text, TextInput, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { getAllData, saveRunLog, saveLiftLog } from '../../lib/storage';
import { getTodayWorkout } from '../../lib/training-plan';
import { DayWorkout, AppSettings, RunLog, LiftLog } from '../../lib/types';
import { DEFAULT_SETTINGS } from '../../lib/storage';

export default function LogScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [todayWorkout, setTodayWorkout] = useState<DayWorkout | null>(null);
  const [distance, setDistance] = useState('');
  const [feel, setFeel] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [alreadyLogged, setAlreadyLogged] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  useFocusEffect(useCallback(() => {
    setSaved(false);
    loadData();
  }, []));

  async function loadData() {
    const data = await getAllData();
    setSettings(data.settings);
    const workout = getTodayWorkout(data.settings.trainingStart, data.settings.planMode);
    setTodayWorkout(workout);
    if (workout) {
      const hasRun = !!data.runLogs[today];
      const hasLift = !!data.liftLogs[today];
      setAlreadyLogged(workout.runType ? hasRun : hasLift);
    }
  }

  const isRunDay = todayWorkout?.runType != null;
  const isLiftDay = ['push','pull','legs','shoulders'].includes(todayWorkout?.type ?? '');
  const isRestDay = todayWorkout?.type === 'rest';

  async function handleSaveRun() {
    if (!distance || !feel) return;
    const log: RunLog = {
      workoutDate: today,
      distance: parseFloat(distance),
      feel,
      loggedAt: new Date().toISOString(),
    };
    await saveRunLog(log);
    setSaved(true);
  }

  async function handleMarkLiftDone() {
    const log: LiftLog = {
      workoutDate: today,
      completed: true,
      loggedAt: new Date().toISOString(),
    };
    await saveLiftLog(log);
    setSaved(true);
  }

  const FEEL_OPTIONS = [1,2,3,4,5,6,7,8,9,10];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
          <Text style={{ color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.xl }}>
            Log Today
          </Text>

          {!todayWorkout && (
            <Text style={{ color: Colors.textMuted }}>Training hasn't started yet.</Text>
          )}

          {isRestDay && (
            <Card>
              <Text style={{ color: Colors.textMuted, fontSize: FontSize.lg, textAlign: 'center' }}>Rest day. Nothing to log.</Text>
            </Card>
          )}

          {saved && (
            <Card style={{ backgroundColor: Colors.success + '22', borderColor: Colors.success, marginBottom: Spacing.md }}>
              <Text style={{ color: Colors.success, fontWeight: '700', textAlign: 'center', fontSize: FontSize.md }}>
                ✓ Logged!
              </Text>
            </Card>
          )}

          {alreadyLogged && !saved && (
            <Card style={{ marginBottom: Spacing.md }}>
              <Text style={{ color: Colors.textMuted, textAlign: 'center' }}>Already logged today.</Text>
            </Card>
          )}

          {isRunDay && !alreadyLogged && !saved && (
            <Card>
              <Text style={{ color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md }}>
                {todayWorkout?.label}
              </Text>

              <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.xs }}>DISTANCE ({settings.units})</Text>
              <TextInput
                value={distance}
                onChangeText={setDistance}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor={Colors.textDim}
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: Radius.md,
                  padding: Spacing.md,
                  color: Colors.text,
                  fontSize: FontSize.xl,
                  fontWeight: '700',
                  marginBottom: Spacing.lg,
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              />

              <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.sm }}>HOW DID IT FEEL?</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg }}>
                {FEEL_OPTIONS.map(n => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setFeel(n)}
                    style={{
                      width: 44, height: 44,
                      borderRadius: Radius.sm,
                      backgroundColor: feel === n ? Colors.primary : Colors.surface,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: feel === n ? Colors.primary : Colors.border,
                    }}
                  >
                    <Text style={{ color: feel === n ? Colors.bg : Colors.text, fontWeight: '700' }}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button label="Save Run" onPress={handleSaveRun} disabled={!distance || !feel} />
            </Card>
          )}

          {isLiftDay && !isRunDay && !alreadyLogged && !saved && (
            <Card>
              <Text style={{ color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', marginBottom: Spacing.sm }}>
                {todayWorkout?.label}
              </Text>
              <Text style={{ color: Colors.textMuted, marginBottom: Spacing.lg }}>
                Log your sets in Strong. Come back when you're done.
              </Text>
              <Button label="Mark Done" onPress={handleMarkLiftDone} />
            </Card>
          )}

          {isLiftDay && isRunDay && !alreadyLogged && !saved && (
            <Card>
              <Text style={{ color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.sm }}>
                {todayWorkout?.label}
              </Text>
              <Text style={{ color: Colors.textMuted, marginBottom: Spacing.md, fontSize: FontSize.sm }}>Log your run below. Mark lift done when finished.</Text>

              <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.xs }}>DISTANCE ({settings.units})</Text>
              <TextInput
                value={distance}
                onChangeText={setDistance}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor={Colors.textDim}
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: Radius.md,
                  padding: Spacing.md,
                  color: Colors.text,
                  fontSize: FontSize.xl,
                  fontWeight: '700',
                  marginBottom: Spacing.lg,
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              />

              <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.sm }}>HOW DID THE RUN FEEL?</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg }}>
                {FEEL_OPTIONS.map(n => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setFeel(n)}
                    style={{
                      width: 44, height: 44,
                      borderRadius: Radius.sm,
                      backgroundColor: feel === n ? Colors.primary : Colors.surface,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: feel === n ? Colors.primary : Colors.border,
                    }}
                  >
                    <Text style={{ color: feel === n ? Colors.bg : Colors.text, fontWeight: '700' }}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button label="Save Run + Mark Lift Done" onPress={async () => { await handleSaveRun(); await handleMarkLiftDone(); }} disabled={!distance || !feel} />
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

**Step 2: Commit**

```bash
git add app/(tabs)/log.tsx
git commit -m "feat: Log screen - run distance/feel + lift mark done"
git push
```

---

## Task 9: Schedule Screen

**Files:**
- Modify: `app/(tabs)/schedule.tsx`
- Create: `components/schedule/WeekCard.tsx`
- Create: `components/schedule/DayRow.tsx`

**Step 1: DayRow**

```typescript
// components/schedule/DayRow.tsx
import { View, Text } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { DayWorkout } from '../../lib/types';
import { WorkoutTypePill } from '../ui/WorkoutTypePill';
import { format, parseISO } from 'date-fns';

interface Props {
  workout: DayWorkout;
  completed: boolean;
  isToday: boolean;
}

export function DayRow({ workout, completed, isToday }: Props) {
  const dayLabel = format(parseISO(workout.date), 'EEE');

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: isToday ? Colors.primary + '11' : 'transparent',
      borderWidth: isToday ? 1 : 0,
      borderColor: isToday ? Colors.primary + '44' : 'transparent',
      marginBottom: 2,
    }}>
      <Text style={{
        color: isToday ? Colors.primary : Colors.textMuted,
        fontSize: FontSize.sm,
        fontWeight: '700',
        width: 36,
      }}>{dayLabel}</Text>

      <View style={{ flex: 1 }}>
        <Text style={{ color: Colors.text, fontSize: FontSize.md, fontWeight: workout.type === 'rest' ? '400' : '600' }}>
          {workout.label}
        </Text>
        {workout.targetMiles && (
          <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs }}>{workout.targetMiles} mi</Text>
        )}
      </View>

      {completed && (
        <Text style={{ color: Colors.success, fontSize: FontSize.sm }}>✓</Text>
      )}
    </View>
  );
}
```

**Step 2: WeekCard**

```typescript
// components/schedule/WeekCard.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Card } from '../ui/Card';
import { DayRow } from './DayRow';
import { Colors, FontSize, Spacing } from '../../constants/theme';
import { DayWorkout } from '../../lib/types';
import { format } from 'date-fns';

interface Props {
  weekNumber: number;
  workouts: DayWorkout[];
  completedDates: Set<string>;
  todayDate: string;
  isCurrentWeek: boolean;
}

export function WeekCard({ weekNumber, workouts, completedDates, todayDate, isCurrentWeek }: Props) {
  const [expanded, setExpanded] = useState(isCurrentWeek);
  const longRun = workouts.find(w => w.type === 'long_run');

  return (
    <Card style={{ marginBottom: Spacing.sm }}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: isCurrentWeek ? Colors.primary : Colors.text, fontSize: FontSize.lg, fontWeight: '800' }}>
              Week {weekNumber} {isCurrentWeek ? '← Now' : ''}
            </Text>
            {longRun?.targetMiles ? (
              <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm }}>
                Long run: {longRun.targetMiles} mi
              </Text>
            ) : null}
          </View>
          <Text style={{ color: Colors.textMuted, fontSize: FontSize.xl }}>{expanded ? '−' : '+'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: Spacing.sm }}>
          {workouts.map(w => (
            <DayRow
              key={w.date}
              workout={w}
              completed={completedDates.has(w.date)}
              isToday={w.date === todayDate}
            />
          ))}
        </View>
      )}
    </Card>
  );
}
```

**Step 3: Schedule screen**

```typescript
// app/(tabs)/schedule.tsx
import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Colors, Spacing, FontSize } from '../../constants/theme';
import { getAllData } from '../../lib/storage';
import { generateFullPlan } from '../../lib/training-plan';
import { currentTrainingWeek } from '../../lib/date-utils';
import { DayWorkout, AppSettings } from '../../lib/types';
import { DEFAULT_SETTINGS } from '../../lib/storage';
import { WeekCard } from '../../components/schedule/WeekCard';

export default function ScheduleScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [plan, setPlan] = useState<DayWorkout[]>([]);
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await getAllData();
    setSettings(data.settings);
    const fullPlan = generateFullPlan(data.settings.trainingStart, data.settings.planMode);
    setPlan(fullPlan);
    const done = new Set([
      ...Object.keys(data.runLogs),
      ...Object.keys(data.liftLogs),
    ]);
    setCompletedDates(done);
    setLoading(false);
  }

  const currentWeek = currentTrainingWeek(settings.trainingStart);

  // Group by week
  const weeks: Record<number, DayWorkout[]> = {};
  plan.forEach(w => {
    if (!weeks[w.weekNumber]) weeks[w.weekNumber] = [];
    weeks[w.weekNumber].push(w);
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Text style={{ color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.xl }}>
          Schedule
        </Text>

        {loading ? (
          <Text style={{ color: Colors.textMuted }}>Loading...</Text>
        ) : (
          Object.entries(weeks).map(([weekNum, workouts]) => (
            <WeekCard
              key={weekNum}
              weekNumber={parseInt(weekNum)}
              workouts={workouts}
              completedDates={completedDates}
              todayDate={today}
              isCurrentWeek={parseInt(weekNum) === currentWeek}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

**Step 4: Commit**

```bash
git add app/(tabs)/schedule.tsx components/schedule/
git commit -m "feat: Schedule screen - 20-week collapsible plan"
git push
```

---

## Task 10: Progress Screen

**Files:**
- Modify: `app/(tabs)/progress.tsx`

**Step 1: Progress screen (stats without chart library to stay Expo Go safe)**

```typescript
// app/(tabs)/progress.tsx
import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { getAllData } from '../../lib/storage';
import { generateFullPlan } from '../../lib/training-plan';
import { currentTrainingWeek } from '../../lib/date-utils';
import { DayWorkout, AppSettings, RunLog } from '../../lib/types';
import { DEFAULT_SETTINGS } from '../../lib/storage';

export default function ProgressScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [runLogs, setRunLogs] = useState<Record<string, RunLog>>({});
  const [plan, setPlan] = useState<DayWorkout[]>([]);
  const [liftCount, setLiftCount] = useState(0);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    const data = await getAllData();
    setSettings(data.settings);
    setRunLogs(data.runLogs);
    setLiftCount(Object.keys(data.liftLogs).length);
    setPlan(generateFullPlan(data.settings.trainingStart, data.settings.planMode));
  }

  const week = currentTrainingWeek(settings.trainingStart);
  const totalMiles = Object.values(runLogs).reduce((sum, l) => sum + l.distance, 0);
  const runCount = Object.keys(runLogs).length;
  const avgFeel = runCount > 0
    ? (Object.values(runLogs).reduce((sum, l) => sum + l.feel, 0) / runCount).toFixed(1)
    : '—';

  // Weekly miles breakdown (last 6 weeks)
  const weeklyMiles: { week: number; miles: number }[] = [];
  for (let w = Math.max(1, week - 5); w <= week; w++) {
    const weekDates = plan.filter(p => p.weekNumber === w).map(p => p.date);
    const miles = weekDates.reduce((sum, d) => sum + (runLogs[d]?.distance ?? 0), 0);
    weeklyMiles.push({ week: w, miles });
  }

  const maxMiles = Math.max(...weeklyMiles.map(w => w.miles), 1);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Text style={{ color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.xl }}>
          Progress
        </Text>

        {/* Summary stats */}
        <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md }}>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: Colors.run, fontSize: FontSize.xxl, fontWeight: '800' }}>{totalMiles.toFixed(1)}</Text>
            <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.5 }}>TOTAL MI</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: Colors.lift, fontSize: FontSize.xxl, fontWeight: '800' }}>{liftCount}</Text>
            <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.5 }}>LIFTS DONE</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: Colors.primary, fontSize: FontSize.xxl, fontWeight: '800' }}>{avgFeel}</Text>
            <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.5 }}>AVG FEEL</Text>
          </Card>
        </View>

        {/* Weekly mileage bar chart (manual) */}
        {week > 0 && (
          <Card style={{ marginBottom: Spacing.md }}>
            <Text style={{ color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md }}>
              Weekly Mileage
            </Text>
            {weeklyMiles.map(({ week: w, miles }) => (
              <View key={w} style={{ marginBottom: Spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs, width: 52 }}>Wk {w}</Text>
                  <View style={{ flex: 1, height: 20, backgroundColor: Colors.surface, borderRadius: Radius.sm, overflow: 'hidden' }}>
                    <View style={{
                      width: `${(miles / maxMiles) * 100}%`,
                      height: '100%',
                      backgroundColor: w === week ? Colors.primary : Colors.run,
                      borderRadius: Radius.sm,
                    }} />
                  </View>
                  <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs, width: 36, textAlign: 'right' }}>
                    {miles.toFixed(1)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {week === 0 && (
          <Card>
            <Text style={{ color: Colors.textMuted, textAlign: 'center' }}>Progress data will appear once training starts on June 7, 2026.</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

**Step 2: Commit**

```bash
git add app/(tabs)/progress.tsx
git commit -m "feat: Progress screen - mileage stats + weekly bar chart"
git push
```

---

## Task 11: Settings Screen (Bonus)

**Files:**
- Create: `app/(tabs)/settings.tsx`
- Modify: `app/(tabs)/_layout.tsx` (add settings tab)

**Step 1: Basic settings**

```typescript
// app/(tabs)/settings.tsx
import { View, Text, ScrollView, SafeAreaView, Switch } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Colors, Spacing, FontSize } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { getSettings, saveSettings } from '../../lib/storage';
import { AppSettings, PlanMode } from '../../lib/types';
import { DEFAULT_SETTINGS } from '../../lib/storage';
import { Button } from '../../components/ui/Button';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useFocusEffect(useCallback(() => { getSettings().then(setSettings); }, []));

  async function toggle4Lift() {
    const next: AppSettings = { ...settings, planMode: settings.planMode === '4lift' ? '3lift' : '4lift' };
    setSettings(next);
    await saveSettings(next);
  }

  async function toggleUnits() {
    const next: AppSettings = { ...settings, units: settings.units === 'mi' ? 'km' : 'mi' };
    setSettings(next);
    await saveSettings(next);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Text style={{ color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.xl }}>Settings</Text>

        <Card style={{ marginBottom: Spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: Colors.text, fontWeight: '700' }}>4 Lift / Week</Text>
              <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm }}>
                {settings.planMode === '4lift' ? 'Mon/Tue/Thu/Fri lifts' : '3 lifts (Mon/Tue/Thu)'}
              </Text>
            </View>
            <Switch
              value={settings.planMode === '4lift'}
              onValueChange={toggle4Lift}
              trackColor={{ true: Colors.primary, false: Colors.border }}
              thumbColor={Colors.text}
            />
          </View>
        </Card>

        <Card style={{ marginBottom: Spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: Colors.text, fontWeight: '700' }}>Distance Unit</Text>
              <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm }}>{settings.units === 'mi' ? 'Miles' : 'Kilometers'}</Text>
            </View>
            <Switch
              value={settings.units === 'mi'}
              onValueChange={toggleUnits}
              trackColor={{ true: Colors.primary, false: Colors.border }}
              thumbColor={Colors.text}
            />
          </View>
        </Card>

        <Card>
          <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm }}>Race Day</Text>
          <Text style={{ color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' }}>{settings.raceDate}</Text>
          <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.sm }}>Training Start</Text>
          <Text style={{ color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' }}>{settings.trainingStart}</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
```

**Step 2: Add to tab layout**

Add a 5th tab for Settings with a settings-outline icon.

**Step 3: Commit + push**

```bash
git add app/(tabs)/settings.tsx app/(tabs)/_layout.tsx
git commit -m "feat: Settings screen - plan mode + units toggle"
git push
```

---

## Task 12: Final Polish + Test on Device

**Step 1: Verify Expo Go launch**
```bash
npx expo start --tunnel
```
Scan with Expo Go on iPhone. Walk all 5 screens.

**Step 2: Checklist**
- [ ] Today screen shows countdown + today's workout
- [ ] Today (pre-training start) shows "Training starts June 7" message
- [ ] Log screen shows correct form for today's workout type
- [ ] Schedule loads all 20 weeks, current week expanded
- [ ] Progress shows stats (0 until logs exist)
- [ ] Settings toggles persist on reload

**Step 3: Final commit**
```bash
git add .
git commit -m "chore: final polish pass"
git push
```
