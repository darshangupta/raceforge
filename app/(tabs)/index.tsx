import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { Colors, Spacing, FontSize } from '../../constants/theme';
import { getAllData, DEFAULT_SETTINGS } from '../../lib/storage';
import { getTodayWorkout } from '../../lib/training-plan';
import { AppSettings, DayWorkout } from '../../lib/types';
import { CountdownBanner } from '../../components/today/CountdownBanner';
import { TodayWorkoutCard } from '../../components/today/TodayWorkoutCard';

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
      const done = isRunDay ? !!data.runLogs[today] : !!data.liftLogs[today];
      setCompleted(done);
    }
    setLoading(false);
  }

  const todayLabel = format(new Date(), 'EEEE, MMMM d').toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600', letterSpacing: 1, marginBottom: Spacing.xs }}>
          {todayLabel}
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
            onNavigateToLog={() => router.push('/(tabs)/log')}
          />
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: Spacing.xxl }}>
            <Text style={{ color: Colors.textMuted, fontSize: FontSize.lg, textAlign: 'center' }}>Training starts June 7, 2026</Text>
            <Text style={{ color: Colors.textDim, fontSize: FontSize.md, marginTop: Spacing.sm, textAlign: 'center' }}>
              Keep lifting. See you at the start line.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
