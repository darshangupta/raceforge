import { View, Text } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { DayWorkout } from '../../lib/types';
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
        <Text style={{
          color: Colors.text,
          fontSize: FontSize.md,
          fontWeight: workout.type === 'rest' ? '400' : '600',
        }}>
          {workout.label}
        </Text>
        {workout.targetMiles != null && (
          <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs }}>{workout.targetMiles} mi</Text>
        )}
      </View>

      {completed && (
        <Text style={{ color: Colors.success, fontSize: FontSize.sm }}>✓</Text>
      )}
    </View>
  );
}
