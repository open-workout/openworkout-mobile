import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { insertWorkout } from './db/workouts';
import { insertSet } from './db/sets';
import { useWeightUnit } from './hooks/useWeightUnit';
import { getPendingWorkout, clearPendingWorkout } from './lib/pendingWorkout';
import { compressMuscles } from './constants/splits';
import type { GeneratedSlot } from './lib/generateWorkout';

const C = {
  bg: '#0a0a0a',
  card: '#18181b',
  border: '#27272a',
  borderAlt: '#3f3f46',
  text: '#f4f4f5',
  textMuted: '#71717a',
  textDim: '#52525b',
  green: '#34d399',
};

const TYPE_LABEL: Record<string, string> = {
  compound: 'Compound',
  accessory: 'Accessory',
  isolation: 'Isolation',
};

export default function GeneratedWorkoutScreen() {
  const router = useRouter();
  const { unit: weightUnit } = useWeightUnit();

  const pending = getPendingWorkout();

  const [slots, setSlots] = useState<GeneratedSlot[]>(pending?.slots ?? []);
  const [selections, setSelections] = useState<number[]>(
    (pending?.slots ?? []).map(() => 0),
  );
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!pending) router.back();
  }, []);

  const cycleSlot = (slotIndex: number, direction: 1 | -1) => {
    const total = slots[slotIndex].candidates.length;
    setSelections((prev) =>
      prev.map((sel, i) => (i === slotIndex ? (sel + direction + total) % total : sel)),
    );
  };

  const handleStart = async () => {
    if (starting || slots.length === 0) return;
    setStarting(true);
    try {
      const id = await insertWorkout({ title: '', started_at: new Date().toISOString() });
      // Insert seeds in reverse order so slot[0] ends up at the top of the workout screen
      for (let i = slots.length - 1; i >= 0; i--) {
        const exercise = slots[i].candidates[selections[i]];
        await insertSet({
          workout_id: id,
          exercise_id: exercise.id ?? exercise.name,
          reps: 0,
          difficulty: 0,
          weight: 0,
          unit: weightUnit,
          logged_at: 'seed',
        });
      }
      clearPendingWorkout();
      router.replace(`/workout?workoutId=${id}`);
    } finally {
      setStarting(false);
    }
  };

  const muscleLabel = pending?.muscles
    ? compressMuscles(pending.muscles)
        .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
        .join(' · ')
    : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-down" size={26} color={C.textMuted} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>Generated Workout</Text>
          {!!muscleLabel && (
            <Text style={{ color: C.textDim, fontSize: 12, marginTop: 2 }}>{muscleLabel}</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {slots.map((slot, slotIndex) => {
          const selected = selections[slotIndex];
          const exercise = slot.candidates[selected];
          const total = slot.candidates.length;
          const muscles = exercise.primary_muscles.join(', ');

          return (
            <View
              key={slotIndex}
              style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12 }}
            >
              {/* Type chip */}
              <Text style={{ color: C.textDim, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                {TYPE_LABEL[slot.type] ?? slot.type}
              </Text>

              {/* Exercise name */}
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
                {exercise.name}
              </Text>

              {/* Muscles */}
              {!!muscles && (
                <Text style={{ color: C.textMuted, fontSize: 13, marginBottom: total > 1 ? 14 : 0, textTransform: 'capitalize' }}>
                  {muscles}
                </Text>
              )}

              {/* Candidate cycler */}
              {total > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}>
                  <TouchableOpacity
                    onPress={() => cycleSlot(slotIndex, -1)}
                    style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141414', borderRadius: 8, borderWidth: 1, borderColor: C.border }}
                  >
                    <Ionicons name="chevron-back" size={18} color={C.textMuted} />
                  </TouchableOpacity>

                  <Text style={{ color: C.textDim, fontSize: 13 }}>
                    {selected + 1} / {total}
                  </Text>

                  <TouchableOpacity
                    onPress={() => cycleSlot(slotIndex, 1)}
                    style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141414', borderRadius: 8, borderWidth: 1, borderColor: C.border }}
                  >
                    <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {slots.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 48 }}>
            <Ionicons name="barbell-outline" size={48} color={C.border} />
            <Text style={{ color: C.textDim, fontSize: 16, marginTop: 16 }}>No exercises found</Text>
            <Text style={{ color: C.textDim, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
              Add more exercises to the library that match your target muscles
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Start button */}
      {slots.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}>
          <TouchableOpacity
            onPress={handleStart}
            disabled={starting}
            activeOpacity={0.85}
            style={{ backgroundColor: starting ? C.card : C.text, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ color: starting ? C.textMuted : '#09090b', fontSize: 16, fontWeight: '700' }}>
              {starting ? 'Starting…' : 'Start Workout'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
