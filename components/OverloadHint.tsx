import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function OverloadHint({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(52,211,153,0.06)' }}>
      <Ionicons name="trending-up-outline" size={13} color="#34d399" />
      <Text style={{ color: '#34d399', fontSize: 12, fontWeight: '600', flex: 1 }}>{label}</Text>
    </View>
  );
}
