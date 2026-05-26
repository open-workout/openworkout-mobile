import { View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar, ActivityIndicator } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import { useExercises } from '../hooks/useExercises';
import AddExerciseModal from '../components/AddExerciseModal';
import type { LocalExercise } from '../db/exercises';

const categories = ['All', 'Chest', 'Back', 'Legs', 'Arms', 'Shoulders'];

const categoryMuscleKeywords: Record<string, string[]> = {
  Chest: ['chest'],
  Back: ['back', 'lats', 'traps', 'rhomboids'],
  Legs: ['legs', 'quads', 'glutes', 'hamstrings', 'calves'],
  Arms: ['bicep', 'tricep', 'forearm'],
  Shoulders: ['delt', 'shoulder'],
};

function matchesCategory(ex: LocalExercise, category: string): boolean {
  if (category === 'All') return true;
  const keywords = categoryMuscleKeywords[category] ?? [];
  const muscles = [...ex.primary_muscles, ...ex.secondary_muscles].map((m) => m.toLowerCase());
  return keywords.some((kw) => muscles.some((m) => m.includes(kw)));
}

export default function ExploreScreen() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const { exercises, isLoading, createExercise } = useExercises();

  const filtered = useMemo(() => {
    const cat = categories[activeCategory];
    return exercises.filter(
      (ex) =>
        matchesCategory(ex, cat) &&
        ex.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [exercises, activeCategory, search]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', letterSpacing: -0.3 }}>Library</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowAdd(true)}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#27272a' }}
            >
              <Ionicons name="add" size={22} color="#f4f4f5" />
            </TouchableOpacity>
            <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#27272a' }}>
              <Ionicons name="options-outline" size={20} color="#a1a1aa" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 }}>
          <Ionicons name="search-outline" size={18} color="#52525b" style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Find an exercise..."
            placeholderTextColor="#52525b"
            style={{ flex: 1, color: '#fff', fontSize: 14 }}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 12, gap: 8 }}
          style={{ borderBottomWidth: 1, borderBottomColor: '#18181b' }}
        >
          {categories.map((cat, i) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(i)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: i === activeCategory ? '#f4f4f5' : '#18181b',
                borderWidth: i === activeCategory ? 0 : 1,
                borderColor: '#27272a',
              }}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: i === activeCategory ? '#09090b' : '#d4d4d8',
              }}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {isLoading && exercises.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#a1a1aa" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        >
          {filtered.length === 0 ? (
            <Text style={{ color: '#52525b', fontSize: 14, marginTop: 32, textAlign: 'center' }}>
              No exercises found
            </Text>
          ) : (
            <>
              <Text style={{ color: '#71717a', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 16, marginBottom: 12 }}>
                {filtered.length} exercise{filtered.length !== 1 ? 's' : ''}
              </Text>
              {filtered.map((ex) => (
                <ExerciseRow key={ex.local_id} exercise={ex} />
              ))}
            </>
          )}
        </ScrollView>
      )}

      <AddExerciseModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={createExercise}
      />
    </SafeAreaView>
  );
}

function ExerciseRow({ exercise }: { exercise: LocalExercise }) {
  const muscle = exercise.primary_muscles[0] ?? exercise.exercise_type ?? '—';

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(24,24,27,0.4)',
      borderWidth: 1,
      borderColor: 'rgba(39,39,42,0.5)',
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
    }}>
      <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46', alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="dumbbell" size={24} color="#a1a1aa" />
      </View>
      <View style={{ flex: 1, marginLeft: 16 }}>
        <Text style={{ color: '#f4f4f5', fontSize: 14, fontWeight: '700' }}>{exercise.name}</Text>
        <Text style={{ color: '#52525b', fontSize: 12, marginTop: 4 }}>
          {muscle} • {exercise.exercise_type || 'exercise'}
        </Text>
      </View>
      <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="add" size={18} color="#d4d4d8" />
      </TouchableOpacity>
    </View>
  );
}
