import { View, Text, ScrollView, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const prs = [
  { initial: 'B', name: 'Bench Press', type: 'Estimated 1RM', value: '110 kg', change: '+5kg this month', positive: true },
  { initial: 'D', name: 'Deadlift', type: 'Max Volume', value: '3,200 kg', change: 'Oct 14, 2023', positive: false },
];

export default function ProfileScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: '#18181b', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', letterSpacing: -0.3 }}>Profile</Text>
        <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#27272a' }}>
          <Ionicons name="settings-outline" size={20} color="#a1a1aa" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
      >
        {/* User info */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 24 }}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80' }}
            style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#3f3f46' }}
            contentFit="cover"
          />
          <View>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>Marcus P.</Text>
            <Text style={{ color: '#71717a', fontSize: 14, fontWeight: '500', marginTop: 2 }}>Joined Feb 2023</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: '#e4e4e7', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
              <MaterialCommunityIcons name="crown" size={11} color="#09090b" />
              <Text style={{ color: '#09090b', fontSize: 11, fontWeight: '700' }}>PRO</Text>
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(24,24,27,0.6)', borderWidth: 1, borderColor: 'rgba(39,39,42,0.8)', borderRadius: 16, padding: 16, height: 112, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Ionicons name="trending-up-outline" size={20} color="#71717a" />
              <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ color: '#34d399', fontSize: 11, fontWeight: '700' }}>+12%</Text>
              </View>
            </View>
            <View>
              <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900' }}>124</Text>
              <Text style={{ color: '#52525b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 }}>Workouts</Text>
            </View>
          </View>

          <View style={{ flex: 1, backgroundColor: 'rgba(24,24,27,0.6)', borderWidth: 1, borderColor: 'rgba(39,39,42,0.8)', borderRadius: 16, padding: 16, height: 112, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Ionicons name="flash-outline" size={20} color="#71717a" />
              <Ionicons name="flame" size={18} color="#f97316" />
            </View>
            <View>
              <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900' }}>4</Text>
              <Text style={{ color: '#52525b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 }}>Week Streak</Text>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: 'rgba(24,24,27,0.6)', borderWidth: 1, borderColor: 'rgba(39,39,42,0.8)', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <View>
            <Text style={{ color: '#52525b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Total Volume Lifted</Text>
            <Text style={{ color: '#f4f4f5', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}>
              248,500 <Text style={{ fontSize: 14, fontWeight: '600', color: '#71717a' }}>kg</Text>
            </Text>
          </View>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="dumbbell" size={20} color="#d4d4d8" />
          </View>
        </View>

        {/* Personal Records */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: '#f4f4f5', fontSize: 18, fontWeight: '600' }}>Personal Records</Text>
          <TouchableOpacity>
            <Text style={{ color: '#71717a', fontSize: 14, fontWeight: '500' }}>See all</Text>
          </TouchableOpacity>
        </View>

        {prs.map((pr) => (
          <View key={pr.name} style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(24,24,27,0.4)',
            borderWidth: 1,
            borderColor: 'rgba(39,39,42,0.5)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#d4d4d8', fontSize: 17, fontWeight: '900' }}>{pr.initial}</Text>
              </View>
              <View>
                <Text style={{ color: '#f4f4f5', fontSize: 14, fontWeight: '700' }}>{pr.name}</Text>
                <Text style={{ color: '#52525b', fontSize: 12, marginTop: 2 }}>{pr.type}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: '#f4f4f5', fontSize: 15, fontWeight: '700' }}>{pr.value}</Text>
              <Text style={{ fontSize: 10, fontWeight: '600', marginTop: 2, color: pr.positive ? '#34d399' : '#52525b' }}>{pr.change}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
