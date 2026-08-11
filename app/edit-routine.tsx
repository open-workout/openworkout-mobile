import { View, Text, ScrollView, TouchableOpacity, StatusBar, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { getAllRoutines, insertRoutine, updateRoutine } from './db/routines';
import { useExercises } from './hooks/useExercises';
import FormField from './components/FormField';
import AddExerciseModal from './components/AddExerciseModal';
import type { Exercise, NewExerciseInput } from './db/exercises';
import { getAllExercises } from './db/exercises';

const C = {
  bg: '#0a0a0a',
  card: '#18181b',
  border: '#27272a',
  borderAlt: '#3f3f46',
  text: '#f4f4f5',
  textMuted: '#71717a',
  textDim: '#52525b',
};


export default function EditRoutineScreen() {
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const { exercises, createExercise } = useExercises();

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Load existing routine if editing
  useEffect(() => {
    if (!routineId) return;
    Promise.all([getAllRoutines(), getAllExercises()]).then(([routines, allExercises]) => {
      const routine = routines.find((r) => r.id === routineId);
      if (!routine) return;
      setName(routine.name);
      const ordered = routine.exercise_ids
        .map((id) => allExercises.find((e) => e.id === id))
        .filter(Boolean) as Exercise[];
      setSelectedExercises(ordered);
    });
  }, [routineId]);

  const alreadyAdded = useMemo(
    () => new Set(selectedExercises.map((e) => e.id)),
    [selectedExercises],
  );

  const pickerCandidates = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return exercises.filter(
      (e) =>
        !alreadyAdded.has(e.id) &&
        (q === '' || e.name.toLowerCase().includes(q) || (e.alt_names ?? []).some((a) => a.toLowerCase().includes(q))),
    );
  }, [exercises, pickerSearch, alreadyAdded]);

  const addExercise = (exercise: Exercise) => {
    setSelectedExercises((prev) => [...prev, exercise]);
    setShowPicker(false);
    setPickerSearch('');
  };

  const removeExercise = (id: string | undefined) => {
    setSelectedExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    const input = {
      name: name.trim(),
      exercise_ids: selectedExercises.map((e) => e.id).filter(Boolean) as string[],
    };
    if (routineId) {
      await updateRoutine(routineId, input);
    } else {
      await insertRoutine(input);
    }
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: C.textMuted, fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>
          {routineId ? 'Edit Routine' : 'New Routine'}
        </Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FormField
          label="Routine name"
          value={name}
          onChangeText={(t) => { setName(t); if (t.trim()) setNameError(''); }}
          placeholder="e.g. Push Day"
          error={nameError}
          autoFocus={!routineId}
        />

        {/* Exercise list */}
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: C.textDim, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
            Exercises
          </Text>

          {selectedExercises.length === 0 ? (
            <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 24, alignItems: 'center' }}>
              <Text style={{ color: C.textDim, fontSize: 14, textAlign: 'center' }}>
                No exercises added yet. Tap the button below to add exercises to this routine.
              </Text>
            </View>
          ) : (
            selectedExercises.map((exercise, index) => (
              <View
                key={exercise.id ?? index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: C.card,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginBottom: 8,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{exercise.name}</Text>
                  {exercise.primary_muscles.length > 0 && (
                    <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2, textTransform: 'capitalize' }}>
                      {exercise.primary_muscles.join(', ')}
                    </Text>
                  )}
                </View>
                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  backgroundColor: C.border,
                  borderRadius: 6,
                  marginRight: 12,
                }}>
                  <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>
                    {exercise.exercise_type || 'exercise'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeExercise(exercise.id)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close-circle" size={20} color={C.textDim} />
                </TouchableOpacity>
              </View>
            ))
          )}

          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={{
              paddingVertical: 16,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: C.border,
              borderStyle: 'dashed',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4,
            }}
          >
            <Ionicons name="add" size={18} color={C.textDim} />
            <Text style={{ color: C.textDim, fontWeight: '600', fontSize: 15 }}>Add Exercise</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Exercise picker modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowPicker(false); setPickerSearch(''); }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>Add Exercise</Text>
            <TouchableOpacity
              onPress={() => { setShowPicker(false); setPickerSearch(''); }}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={24} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border }}>
            <Ionicons name="search" size={16} color={C.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              value={pickerSearch}
              onChangeText={setPickerSearch}
              placeholder="Search exercises…"
              placeholderTextColor={C.textDim}
              style={{ flex: 1, color: C.text, fontSize: 15, paddingVertical: 10 }}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {pickerSearch.length > 0 && (
              <TouchableOpacity onPress={() => setPickerSearch('')}>
                <Ionicons name="close-circle" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                onPress={() => { setShowPicker(false); setShowCreate(true); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
              >
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="add" size={18} color={C.text} />
                </View>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>Create Exercise</Text>
              </TouchableOpacity>

              {pickerCandidates.length === 0 && pickerSearch.length > 0 ? (
                <View style={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 }}>
                  <Text style={{ color: C.textDim, fontSize: 15, textAlign: 'center' }}>
                    No exercises match your search
                  </Text>
                </View>
              ) : (
                pickerCandidates.map((candidate) => (
                  <TouchableOpacity
                    key={candidate.id ?? candidate.name}
                    onPress={() => addExercise(candidate)}
                    style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
                  >
                    <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{candidate.name}</Text>
                    {candidate.primary_muscles.length > 0 && (
                      <Text style={{ color: C.textDim, fontSize: 13, marginTop: 2, textTransform: 'capitalize' }}>
                        {candidate.primary_muscles.join(', ')}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Create new exercise */}
      <AddExerciseModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={async (input: NewExerciseInput) => {
          await createExercise(input);
          const all = await getAllExercises();
          const fresh = all.find((e) => e.name === input.name);
          if (fresh) addExercise(fresh);
          setShowCreate(false);
        }}
      />
    </SafeAreaView>
  );
}
