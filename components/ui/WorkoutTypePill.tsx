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
