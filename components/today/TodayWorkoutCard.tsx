import { View, Text } from 'react-native';
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
  const hasRun = workout.runType != null;
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

      {workout.targetMiles != null && (
        <Text style={{ color: Colors.textMuted, fontSize: FontSize.md }}>
          Target: {workout.targetMiles} mi
        </Text>
      )}

      {!isRest && !completed && (
        <Button
          label={hasRun ? 'Log Run' : 'Mark Done'}
          onPress={onNavigateToLog}
          style={{ marginTop: Spacing.md }}
        />
      )}
    </Card>
  );
}
