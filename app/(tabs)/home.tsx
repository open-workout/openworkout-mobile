import { View, Text, ScrollView, StatusBar, TouchableOpacity } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const recentWorkouts = [
  {
    id: '1',
    name: 'Heavy Leg Day',
    date: 'Yesterday, 5:30 PM',
    prs: 3,
    stats: [
      { label: 'Time', value: '1h 12m' },
      { label: 'Volume', value: '8,450 kg' },
      { label: 'Sets', value: '24' },
    ],
    exercises: 'Squat, Leg Press, RDLs + 3 more...',
    icon: 'dumbbell' as const,
  },
  {
    id: '2',
    name: 'Cardio & Core',
    date: 'Mon, Oct 12',
    stats: [
      { label: 'Time', value: '45m' },
      { label: 'Distance', value: '5.2 km' },
      { label: 'Avg HR', value: '142 bpm' },
    ],
    icon: 'run' as const,
  },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: '#18181b' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: '#71717a', fontSize: 14, fontWeight: '500', marginBottom: 4 }}>Thursday, Oct 15</Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>Ready to lift, Marcus?</Text>
          </View>
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80' }}
              style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#3f3f46' }}
              contentFit="cover"
            />
            <View style={{ position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#0a0a0a' }} />
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginHorizontal: 24, marginTop: 24, marginBottom: 4 }}>
          <Ionicons name="search-outline" size={20} color="#71717a" style={{ marginRight: 10 }} />
          <Text style={{ color: '#52525b', fontSize: 16 }}>Search exercises...</Text>
        </View>

        {/* Start Workout CTA */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/workout')}
          style={{ marginHorizontal: 24, marginTop: 24, marginBottom: 8 }}
        >
          <LinearGradient
            colors={['#f4f4f5', '#a1a1aa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 2 }}
          >
            <View style={{ backgroundColor: '#0c0c0e', borderRadius: 18, paddingHorizontal: 24, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <LinearGradient
                  colors={['#f4f4f5', '#a1a1aa']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="play" size={22} color="#09090b" style={{ marginLeft: 2 }} />
                </LinearGradient>
                <View>
                  <Text style={{ color: '#f4f4f5', fontSize: 17, fontWeight: '700', marginBottom: 2 }}>Start Empty Workout</Text>
                  <Text style={{ color: '#71717a', fontSize: 14 }}>Track a new session</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#52525b" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Recent Activity */}
        <View style={{ marginTop: 32, paddingHorizontal: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{ color: '#f4f4f5', fontSize: 18, fontWeight: '600' }}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={{ color: '#71717a', fontSize: 14, fontWeight: '500' }}>View History</Text>
            </TouchableOpacity>
          </View>

          {recentWorkouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function WorkoutCard({ workout }: { workout: typeof recentWorkouts[0] }) {
  return (
    <View style={{
      backgroundColor: 'rgba(24,24,27,0.6)',
      borderWidth: 1,
      borderColor: 'rgba(39,39,42,0.8)',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name={workout.icon} size={18} color="#d4d4d8" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#f4f4f5', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 }}>{workout.name}</Text>
          <Text style={{ color: '#52525b', fontSize: 12, fontWeight: '500', marginTop: 2 }}>{workout.date}</Text>
        </View>
        {workout.prs && (
          <View style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#d4d4d8', fontSize: 11, fontWeight: '700' }}>{workout.prs} PRs</Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: workout.exercises ? 16 : 0 }}>
        {workout.stats.map(({ label, value }) => (
          <View key={label} style={{ flex: 1, backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: 'rgba(39,39,42,0.5)', borderRadius: 12, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: '#52525b', fontSize: 11, marginBottom: 4 }}>{label}</Text>
            <Text style={{ color: '#d4d4d8', fontSize: 13, fontWeight: '600' }}>{value}</Text>
          </View>
        ))}
      </View>

      {workout.exercises && (
        <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(39,39,42,0.8)', paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="flame" size={14} color="#52525b" />
          <Text style={{ color: '#71717a', fontSize: 13, flex: 1 }} numberOfLines={1}>{workout.exercises}</Text>
        </View>
      )}
    </View>
  );
}
