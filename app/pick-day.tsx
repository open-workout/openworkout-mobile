import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native";
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSplit } from './hooks/useSplit';
import { useExercises } from './hooks/useExercises';
import { useWorkoutPreferences } from './hooks/useWorkoutPreferences';
import { insertWorkout } from './db/workouts';
import { getAllExerciseStats } from './db/exerciseStats';
import { generateWorkout } from './lib/generateWorkout';
import { setPendingWorkout } from './lib/pendingWorkout';
import {
  compressMuscles,
  expandMuscles,
  MUSCLE_SECTIONS_SPLIT,
  SUPER_MUSCLE_MAP,
  getSuperState,
  type SplitDay,
  type SuperState,
} from './constants/splits';

export default function PickDayScreen() {
  const router = useRouter();
  const { split, isLoading } = useSplit();
  const { exercises } = useExercises();
  const { prefs } = useWorkoutPreferences();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showMusclePicker, setShowMusclePicker] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);

  const activeMuscles = selectedDay
    ? expandMuscles(split?.days.find((d) => d.name === selectedDay)?.muscles ?? [])
    : expandMuscles(selectedMuscles);
  const canGenerate = activeMuscles.length > 0 && exercises.length > 0 && prefs !== null;

  const handleSelect = async (title: string) => {
    const id = await insertWorkout({ title, started_at: new Date().toISOString() });
    router.replace(`/workout?workoutId=${id}`);
  };

  const handleGenerate = async () => {
    if (!canGenerate || !prefs) return;
    const stats = await getAllExerciseStats();
    const slots = generateWorkout(activeMuscles, exercises, stats, prefs);
    setPendingWorkout(slots, activeMuscles);
    router.push('/generated-workout');
  };

  const toggleMuscle = (muscle: string) => {
    setSelectedMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  };

  if (showMusclePicker) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
          <TouchableOpacity
            onPress={() => setShowMusclePicker(false)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-back" size={18} color="#a1a1aa" />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', color: '#f4f4f5', fontSize: 17, fontWeight: '700' }}>
            What muscles?
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <MuscleGrid selected={selectedMuscles} onToggle={toggleMuscle} />
        </ScrollView>

        {/* Footer buttons */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#18181b', gap: 10 }}>
          {canGenerate && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleGenerate}
              style={{ backgroundColor: '#1c1c1f', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              <Ionicons name="sparkles" size={16} color="#f4f4f5" />
              <Text style={{ color: '#f4f4f5', fontSize: 15, fontWeight: '700' }}>Generate workout</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleSelect('')}
            style={{ backgroundColor: '#f4f4f5', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#09090b', fontSize: 16, fontWeight: '700' }}>
              {selectedMuscles.length > 0 ? 'Continue manually' : 'Skip'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
              <DayCard
                key={index}
                day={day}
                selected={selectedDay === day.name}
                onPress={() => setSelectedDay(day.name)}
              />
            ))}

            {!split && (
              <Text style={{ color: '#52525b', fontSize: 14, textAlign: 'center', marginBottom: 24, marginTop: 8 }}>
                No split configured · set one up in Profile
              </Text>
            )}

            <CustomCard onPress={() => setShowMusclePicker(true)} />

            <View style={{ height: 1, backgroundColor: '#18181b', marginVertical: 24 }} />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleGenerate}
              disabled={!canGenerate}
              style={{ backgroundColor: canGenerate ? '#1c1c1f' : '#18181b', borderWidth: 1, borderColor: canGenerate ? '#3f3f46' : '#27272a', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="sparkles" size={17} color={canGenerate ? '#f4f4f5' : '#a1a1aa'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: canGenerate ? '#f4f4f5' : '#71717a', fontSize: 16, fontWeight: '700' }}>Generate workout</Text>
                <Text style={{ color: '#71717a', fontSize: 13, marginTop: 2 }}>
                  {canGenerate ? 'Based on selected muscles' : 'Select a day above to enable'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#52525b" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelect('Manual Workout')}
              style={{ backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="list" size={17} color="#a1a1aa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#f4f4f5', fontSize: 16, fontWeight: '700' }}>Manual mode</Text>
                <Text style={{ color: '#71717a', fontSize: 13, marginTop: 2 }}>Build your workout from scratch</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#52525b" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MuscleGrid({ selected, onToggle }: { selected: string[]; onToggle: (m: string) => void }) {
  function handleSuperToggle(superKey: string) {
    const children = SUPER_MUSCLE_MAP[superKey];
    const state = getSuperState(superKey, selected);
    if (state === 'all') {
      children.forEach((c) => { if (selected.includes(c)) onToggle(c); });
    } else {
      children.forEach((c) => { if (!selected.includes(c)) onToggle(c); });
    }
  }

  return (
    <View>
      {MUSCLE_SECTIONS_SPLIT.map((section) => (
        <View key={section.label} style={{ marginBottom: 12 }}>
          <Text style={{ color: '#52525b', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
            {section.label}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {section.muscles.map((muscle) => {
              if (section.isSuper) {
                const state = getSuperState(muscle, selected);
                return (
                  <MuscleChip
                    key={muscle}
                    muscle={muscle}
                    isSelected={false}
                    isSuper
                    superState={state}
                    onPress={() => handleSuperToggle(muscle)}
                  />
                );
              }
              return (
                <MuscleChip
                  key={muscle}
                  muscle={muscle}
                  isSelected={selected.includes(muscle)}
                  isSuper={false}
                  onPress={() => onToggle(muscle)}
                />
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

function MuscleChip({ muscle, isSelected, isSuper, superState, onPress }: {
  muscle: string;
  isSelected: boolean;
  isSuper: boolean;
  superState?: SuperState;
  onPress: () => void;
}) {
  const isSome = isSuper && superState === 'some';
  const isAll = isSuper && superState === 'all';
  const effectiveSelected = isSuper ? isAll : isSelected;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: effectiveSelected ? '#f4f4f5' : isSome ? '#1c1c1f' : '#18181b',
        borderWidth: 1,
        borderColor: effectiveSelected ? '#f4f4f5' : isSome ? '#3f3f46' : isSuper ? '#3f3f46' : '#27272a',
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      {isSuper && (
        <Ionicons name="layers-outline" size={11} color={effectiveSelected ? '#09090b' : '#71717a'} />
      )}
      <Text style={{ fontSize: 13, fontWeight: '600', color: effectiveSelected ? '#09090b' : '#f4f4f5', textTransform: 'capitalize' }}>
        {muscle}
      </Text>
    </TouchableOpacity>
  );
}

function DayCard({ day, selected, onPress }: { day: SplitDay; selected: boolean; onPress: () => void }) {
  const muscleLabel = compressMuscles(day.muscles)
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
    .join(' · ');

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        backgroundColor: selected ? '#1c1c1f' : '#18181b',
        borderWidth: 1,
        borderColor: selected ? '#f4f4f5' : '#27272a',
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
      {selected
        ? <Ionicons name="checkmark-circle" size={22} color="#f4f4f5" />
        : <Ionicons name="chevron-forward" size={18} color="#52525b" />
      }
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
