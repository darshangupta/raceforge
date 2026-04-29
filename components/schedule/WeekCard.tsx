import { View, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Card } from '../ui/Card';
import { DayRow } from './DayRow';
import { Colors, FontSize, Spacing } from '../../constants/theme';
import { DayWorkout } from '../../lib/types';

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
      <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: isCurrentWeek ? Colors.primary : Colors.text, fontSize: FontSize.lg, fontWeight: '800' }}>
              Week {weekNumber}{isCurrentWeek ? '  ← Now' : ''}
            </Text>
            {longRun?.targetMiles != null && (
              <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm }}>Long run: {longRun.targetMiles} mi</Text>
            )}
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
