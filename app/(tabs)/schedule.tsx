import { View, Text } from 'react-native';
import { Colors, FontSize } from '../../constants/theme';

export default function ScheduleScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: Colors.text, fontSize: FontSize.lg }}>Schedule</Text>
    </View>
  );
}
