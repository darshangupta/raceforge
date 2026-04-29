import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { getAllData, DEFAULT_SETTINGS } from '../../lib/storage';
import { generateFullPlan } from '../../lib/training-plan';
import { currentTrainingWeek } from '../../lib/date-utils';
import { DayWorkout, AppSettings, RunLog } from '../../lib/types';

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

        <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md }}>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: Colors.run, fontSize: FontSize.xxl, fontWeight: '800' }}>{totalMiles.toFixed(1)}</Text>
            <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.5 }}>TOTAL MI</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: Colors.lift, fontSize: FontSize.xxl, fontWeight: '800' }}>{liftCount}</Text>
            <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.5 }}>LIFTS</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: Colors.primary, fontSize: FontSize.xxl, fontWeight: '800' }}>{avgFeel}</Text>
            <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.5 }}>AVG FEEL</Text>
          </Card>
        </View>

        {week > 0 && weeklyMiles.length > 0 && (
          <Card style={{ marginBottom: Spacing.md }}>
            <Text style={{ color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md }}>
              Weekly Mileage
            </Text>
            {weeklyMiles.map(({ week: w, miles }) => (
              <View key={w} style={{ marginBottom: Spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs, width: 44 }}>Wk {w}</Text>
                  <View style={{ flex: 1, height: 20, backgroundColor: Colors.surface, borderRadius: Radius.sm, overflow: 'hidden', marginHorizontal: Spacing.sm }}>
                    <View style={{
                      width: `${(miles / maxMiles) * 100}%`,
                      height: '100%',
                      backgroundColor: w === week ? Colors.primary : Colors.run,
                      borderRadius: Radius.sm,
                    }} />
                  </View>
                  <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs, width: 32, textAlign: 'right' }}>
                    {miles.toFixed(1)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {week === 0 && (
          <Card>
            <Text style={{ color: Colors.textMuted, textAlign: 'center' }}>
              Progress data will appear once training starts on June 7, 2026.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
