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
