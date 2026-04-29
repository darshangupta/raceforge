import { View, Text, TextInput, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { getAllData, saveRunLog, saveLiftLog, DEFAULT_SETTINGS } from '../../lib/storage';
import { getTodayWorkout } from '../../lib/training-plan';
import { DayWorkout, AppSettings, RunLog, LiftLog } from '../../lib/types';

const FEEL_OPTIONS = [1,2,3,4,5,6,7,8,9,10];

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
    setDistance('');
    setFeel(null);
    loadData();
  }, []));

  async function loadData() {
    const data = await getAllData();
    setSettings(data.settings);
    const workout = getTodayWorkout(data.settings.trainingStart, data.settings.planMode);
    setTodayWorkout(workout);
    if (workout) {
      const isRunDay = workout.runType != null;
      setAlreadyLogged(isRunDay ? !!data.runLogs[today] : !!data.liftLogs[today]);
    }
  }

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

  async function handleSaveRunAndLift() {
    await handleSaveRun();
    const log: LiftLog = {
      workoutDate: today,
      completed: true,
      loggedAt: new Date().toISOString(),
    };
    await saveLiftLog(log);
  }

  const isRunDay = todayWorkout?.runType != null;
  const isLiftOnly = ['pull','legs','shoulders'].includes(todayWorkout?.type ?? '');
  const isPushDay = todayWorkout?.type === 'push';
  const isRestDay = todayWorkout?.type === 'rest';

  const FeelSelector = () => (
    <>
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
    </>
  );

  const DistanceInput = () => (
    <>
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
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
          <Text style={{ color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.xl }}>
            Log Today
          </Text>

          {saved && (
            <Card style={{ backgroundColor: Colors.success + '22', borderColor: Colors.success, marginBottom: Spacing.md }}>
              <Text style={{ color: Colors.success, fontWeight: '700', textAlign: 'center', fontSize: FontSize.md }}>✓ Logged!</Text>
            </Card>
          )}

          {alreadyLogged && !saved && (
            <Card>
              <Text style={{ color: Colors.textMuted, textAlign: 'center' }}>Already logged today.</Text>
            </Card>
          )}

          {!todayWorkout && !saved && (
            <Card>
              <Text style={{ color: Colors.textMuted, textAlign: 'center' }}>Training hasn't started yet.</Text>
            </Card>
          )}

          {isRestDay && !saved && (
            <Card>
              <Text style={{ color: Colors.textMuted, fontSize: FontSize.lg, textAlign: 'center' }}>Rest day. Nothing to log.</Text>
            </Card>
          )}

          {isLiftOnly && !alreadyLogged && !saved && (
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

          {(isRunDay && !isPushDay) && !alreadyLogged && !saved && (
            <Card>
              <Text style={{ color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md }}>
                {todayWorkout?.label}
              </Text>
              <DistanceInput />
              <FeelSelector />
              <Button label="Save Run" onPress={handleSaveRun} disabled={!distance || !feel} />
            </Card>
          )}

          {isPushDay && !alreadyLogged && !saved && (
            <Card>
              <Text style={{ color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.sm }}>
                {todayWorkout?.label}
              </Text>
              <Text style={{ color: Colors.textMuted, marginBottom: Spacing.md, fontSize: FontSize.sm }}>
                Log your run below. Mark lift done when finished in Strong.
              </Text>
              <DistanceInput />
              <FeelSelector />
              <Button
                label="Save Run + Mark Lift Done"
                onPress={handleSaveRunAndLift}
                disabled={!distance || !feel}
              />
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
