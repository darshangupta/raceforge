import { TouchableOpacity, Text, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing, FontSize } from '../../constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: ViewStyle;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', style, disabled }: Props) {
  const bg = variant === 'primary' ? Colors.primary
           : variant === 'danger' ? Colors.danger
           : 'transparent';
  const textColor = variant === 'primary' ? Colors.bg : Colors.text;
  const border = variant === 'ghost' ? { borderWidth: 1, borderColor: Colors.border } : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[{
        backgroundColor: bg,
        borderRadius: Radius.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center' as const,
        opacity: disabled ? 0.4 : 1,
        ...border,
      }, style]}
    >
      <Text style={{ color: textColor, fontSize: FontSize.md, fontWeight: '700' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
