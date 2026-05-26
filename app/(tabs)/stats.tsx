import { View, Text, StatusBar } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function StatsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: '#18181b' }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', letterSpacing: -0.3 }}>Stats</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="bar-chart-outline" size={24} color="#52525b" />
        </View>
        <Text style={{ color: '#52525b', fontSize: 16, fontWeight: '500' }}>Stats coming soon</Text>
      </View>
    </SafeAreaView>
  );
}
