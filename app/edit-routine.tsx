import { View, Text, ScrollView, FlatList, TouchableOpacity, StatusBar, Modal, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getAllRoutines, insertRoutine, updateRoutine } from './db/routines';
import { useExercises } from './hooks/useExercises';
import { useKeyboardHeight } from './hooks/useKeyboardHeight';
import FormField from './components/FormField';
import AddExerciseModal from './components/AddExerciseModal';
import type { Exercise, NewExerciseInput } from './db/exercises';
import { getAllExercises } from './db/exercises';
import { exerciseMatchesQuery, getExerciseDisplayName, getMuscleLabels } from './lib/exerciseTranslations';

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
  const { t, i18n } = useTranslation('routines');
  const locale = i18n.language;
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const { exercises, createExercise } = useExercises();
  const keyboardHeight = useKeyboardHeight();
  // Android's Modal already resizes for the keyboard natively (SOFT_INPUT_ADJUST_RESIZE);
  // only iOS needs the list to pad itself to clear the keyboard.
  const pickerListBottomPadding = Platform.OS === 'ios' ? keyboardHeight + 24 : 24;

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
    return exercises.filter(
      (e) => !alreadyAdded.has(e.id) && exerciseMatchesQuery(e, pickerSearch, locale),
    );
  }, [exercises, pickerSearch, alreadyAdded, locale]);

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
      setNameError(t('nameRequired'));
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
          <Text style={{ color: C.textMuted, fontSize: 16 }}>{t('common:cancel')}</Text>
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>
          {routineId ? t('editRoutine') : t('newRoutine')}
        </Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>{t('common:save')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FormField
          label={t('routineNameLabel')}
          value={name}
          onChangeText={(text) => { setName(text); if (text.trim()) setNameError(''); }}
          placeholder={t('routineNamePlaceholder')}
          error={nameError}
          autoFocus={!routineId}
        />

        {/* Exercise list */}
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: C.textDim, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
            {t('exercisesSectionTitle')}
          </Text>

          {selectedExercises.length === 0 ? (
            <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 24, alignItems: 'center' }}>
              <Text style={{ color: C.textDim, fontSize: 14, textAlign: 'center' }}>
                {t('noExercisesAdded')}
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
                  <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{getExerciseDisplayName(exercise, locale)}</Text>
                  {exercise.primary_muscles.length > 0 && (
                    <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                      {getMuscleLabels(exercise.primary_muscles, locale).join(', ')}
                    </Text>
                  )}
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
            testID="routine-add-exercise-trigger"
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
            <Text style={{ color: C.textDim, fontWeight: '600', fontSize: 15 }}>{t('addExercise')}</Text>
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
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{t('addExercise')}</Text>
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
              placeholder={t('searchExercisesPlaceholder')}
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

          <FlatList
            testID="routine-exercise-picker-list"
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: pickerListBottomPadding }}
            data={pickerCandidates}
            keyExtractor={(candidate) => candidate.id ?? candidate.name}
            ListHeaderComponent={
              <TouchableOpacity
                onPress={() => { setShowPicker(false); setShowCreate(true); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
              >
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="add" size={18} color={C.text} />
                </View>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{t('createExercise')}</Text>
              </TouchableOpacity>
            }
            ListEmptyComponent={
              pickerSearch.length > 0 ? (
                <View style={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 }}>
                  <Text style={{ color: C.textDim, fontSize: 15, textAlign: 'center' }}>
                    {t('noExercisesMatchSearch')}
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item: candidate }) => (
              <TouchableOpacity
                onPress={() => addExercise(candidate)}
                style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
              >
                <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{getExerciseDisplayName(candidate, locale)}</Text>
                {candidate.primary_muscles.length > 0 && (
                  <Text style={{ color: C.textDim, fontSize: 13, marginTop: 2 }}>
                    {getMuscleLabels(candidate.primary_muscles, locale).join(', ')}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          />
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
