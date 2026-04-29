import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Colors, Spacing, FontSize } from '../../constants/theme';
import { getAllData, DEFAULT_SETTINGS } from '../../lib/storage';
import { generateFullPlan } from '../../lib/training-plan';
import { currentTrainingWeek } from '../../lib/date-utils';
import { DayWorkout, AppSettings } from '../../lib/types';
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
    setPlan(generateFullPlan(data.settings.trainingStart, data.settings.planMode));
    setCompletedDates(new Set([
      ...Object.keys(data.runLogs),
      ...Object.keys(data.liftLogs),
    ]));
    setLoading(false);
  }

  const currentWeek = currentTrainingWeek(settings.trainingStart);

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
