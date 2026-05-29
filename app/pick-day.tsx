import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSplit } from './hooks/useSplit';
import { insertWorkout } from './db/workouts';
import { compressMuscles, type SplitDay } from './constants/splits';

export default function PickDayScreen() {
  const router = useRouter();
  const { split, isLoading } = useSplit();

  const handleSelect = async (title: string) => {
    const id = await insertWorkout({ title, started_at: new Date().toISOString() });
    router.replace(`/workout?workoutId=${id}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="close" size={18} color="#a1a1aa" />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', color: '#f4f4f5', fontSize: 17, fontWeight: '700' }}>
          What are you training today?
        </Text>
        {/* Spacer to balance the close button */}
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color="#71717a" style={{ marginTop: 48 }} />
        ) : (
          <>
            {split?.days.map((day, index) => (
              <DayCard key={index} day={day} onPress={() => handleSelect(day.name)} />
            ))}

            {!split && (
              <Text style={{ color: '#52525b', fontSize: 14, textAlign: 'center', marginBottom: 24, marginTop: 8 }}>
                No split configured · set one up in Profile
              </Text>
            )}

            <CustomCard onPress={() => handleSelect('')} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DayCard({ day, onPress }: { day: SplitDay; onPress: () => void }) {
  const muscleLabel = compressMuscles(day.muscles)
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
    .join(' · ');

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        backgroundColor: '#18181b',
        borderWidth: 1,
        borderColor: '#27272a',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#f4f4f5', fontSize: 17, fontWeight: '700', marginBottom: 4 }}>{day.name}</Text>
        {muscleLabel ? (
          <Text style={{ color: '#71717a', fontSize: 13 }}>{muscleLabel}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#52525b" />
    </TouchableOpacity>
  );
}

function CustomCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderStyle: 'dashed',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#a1a1aa', fontSize: 17, fontWeight: '700', marginBottom: 4 }}>Custom workout</Text>
        <Text style={{ color: '#52525b', fontSize: 13 }}>No specific focus</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#52525b" />
    </TouchableOpacity>
  );
}
