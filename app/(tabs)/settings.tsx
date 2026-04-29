import { View, Text, ScrollView, SafeAreaView, Switch } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Colors, Spacing, FontSize } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '../../lib/storage';
import { AppSettings } from '../../lib/types';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useFocusEffect(useCallback(() => {
    getSettings().then(setSettings);
  }, []));

  async function update(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Text style={{ color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.xl }}>
          Settings
        </Text>

        <Card style={{ marginBottom: Spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: Spacing.md }}>
              <Text style={{ color: Colors.text, fontWeight: '700', fontSize: FontSize.md }}>4 Lifts / Week</Text>
              <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2 }}>
                {settings.planMode === '4lift' ? 'Mon / Tue / Thu / Fri' : 'Mon / Tue / Thu only'}
              </Text>
            </View>
            <Switch
              value={settings.planMode === '4lift'}
              onValueChange={v => update({ planMode: v ? '4lift' : '3lift' })}
              trackColor={{ true: Colors.primary, false: Colors.border }}
              thumbColor={Colors.bg}
            />
          </View>
        </Card>

        <Card style={{ marginBottom: Spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: Spacing.md }}>
              <Text style={{ color: Colors.text, fontWeight: '700', fontSize: FontSize.md }}>Distance Unit</Text>
              <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2 }}>
                {settings.units === 'mi' ? 'Miles' : 'Kilometers'}
              </Text>
            </View>
            <Switch
              value={settings.units === 'mi'}
              onValueChange={v => update({ units: v ? 'mi' : 'km' })}
              trackColor={{ true: Colors.primary, false: Colors.border }}
              thumbColor={Colors.bg}
            />
          </View>
        </Card>

        <Card>
          <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.5, marginBottom: Spacing.sm }}>RACE INFO</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
            <Text style={{ color: Colors.textMuted }}>Race Day</Text>
            <Text style={{ color: Colors.text, fontWeight: '700' }}>{settings.raceDate}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: Colors.textMuted }}>Training Start</Text>
            <Text style={{ color: Colors.text, fontWeight: '700' }}>{settings.trainingStart}</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
