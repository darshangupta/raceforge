import { View, Text } from 'react-native';
import { Colors, Radius, Spacing, FontSize } from '../../constants/theme';

interface Props {
  label: string;
  color?: string;
}

export function Badge({ label, color = Colors.primary }: Props) {
  return (
    <View style={{
      backgroundColor: color + '22',
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ color, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
