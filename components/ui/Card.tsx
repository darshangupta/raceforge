import { View, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: Props) {
  return (
    <View style={[{
      backgroundColor: Colors.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: Colors.border,
    }, style]}>
      {children}
    </View>
  );
}
