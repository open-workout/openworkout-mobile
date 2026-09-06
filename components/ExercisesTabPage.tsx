import { View, Text, ScrollView, FlatList, TouchableOpacity, TextInput, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useExercises } from '../hooks/useExercises';
import AddExerciseModal from './AddExerciseModal';
import ConfirmModal from './ConfirmModal';
import { ExerciseThumbnail } from './ExerciseThumbnail';
import { ExerciseAnimationModal, hasExerciseAnimation } from './ExerciseAnimationModal';
import type { Exercise } from '../db/exercises';
import {
  exerciseMatchesQuery,
  getExerciseDisplayName,
  getMuscleLabel,
  getMuscleLabels,
  getEquipmentLabel,
  getCategoryLabel,
} from '../lib/exerciseTranslations';
import { accent } from '../theme/colors';

const categories = ['All', 'Chest', 'Back', 'Legs', 'Arms', 'Shoulders'];

const categoryMuscleKeywords: Record<string, string[]> = {
  Chest: ['chest'],
  Back: ['back', 'lats', 'traps', 'rhomboids'],
  Legs: ['legs', 'quads', 'glutes', 'hamstrings', 'calves'],
  Arms: ['bicep', 'tricep', 'forearm'],
  Shoulders: ['delt', 'shoulder'],
};

function matchesCategory(ex: Exercise, category: string): boolean {
  if (category === 'All') return true;
  const keywords = categoryMuscleKeywords[category] ?? [];
  const muscles = [...ex.primary_muscles, ...ex.secondary_muscles].map((m) => m.toLowerCase());
  return keywords.some((kw) => muscles.some((m) => m.includes(kw)));
}

export default function ExercisesTabPage() {
  const { t, i18n } = useTranslation('explore');
  const locale = i18n.language;
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [animatingCsvId, setAnimatingCsvId] = useState<string | null>(null);
  const { exercises, isLoading, createExercise, editExercise, deleteExercise } = useExercises();

  const filtered = useMemo(() => {
    const cat = categories[activeCategory];
    return exercises.filter(
      (ex) => matchesCategory(ex, cat) && exerciseMatchesQuery(ex, search, locale),
    );
  }, [exercises, activeCategory, search, locale]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', letterSpacing: -0.3 }}>{t('title')}</Text>
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: accent.teal }}
          >
            <Ionicons name="add" size={22} color={accent.teal} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 }}>
          <Ionicons name="search-outline" size={18} color="#52525b" style={{ marginRight: 10 }} />
          <TextInput
            placeholder={t('searchPlaceholder')}
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
                {getCategoryLabel(cat, locale)}
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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <FlatList
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            data={filtered}
            keyExtractor={(ex) => ex.id ?? ex.name}
            extraData={expandedKey}
            ListHeaderComponent={
              filtered.length > 0 ? (
                <Text style={{ color: '#71717a', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 16, marginBottom: 12 }}>
                  {t('exerciseCount', { count: filtered.length })}
                </Text>
              ) : null
            }
            ListEmptyComponent={
              <Text style={{ color: '#52525b', fontSize: 14, marginTop: 32, textAlign: 'center' }}>
                {t('noExercisesFound')}
              </Text>
            }
            renderItem={({ item: ex }) => {
              const key = ex.id ?? ex.name;
              return (
                <ExerciseRow
                  exercise={ex}
                  expanded={expandedKey === key}
                  onToggle={() => setExpandedKey(expandedKey === key ? null : key)}
                  onEdit={() => setEditingExercise(ex)}
                  onDelete={() => setDeletingExercise(ex)}
                  onShowAnimation={() => setAnimatingCsvId(ex.csv_id)}
                />
              );
            }}
          />
        </KeyboardAvoidingView>
      )}

      <AddExerciseModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={createExercise}
      />
      <AddExerciseModal
        visible={editingExercise !== null}
        exercise={editingExercise ?? undefined}
        onClose={() => setEditingExercise(null)}
        onSubmit={(input) => editExercise(editingExercise!, input)}
      />
      <ConfirmModal
        visible={deletingExercise !== null}
        title={t('deleteExercise')}
        message={t('deleteExerciseMessage', {
          name: deletingExercise ? getExerciseDisplayName(deletingExercise, locale) : '',
        })}
        confirmLabel={t('common:delete')}
        destructive
        onCancel={() => setDeletingExercise(null)}
        onConfirm={() => {
          deleteExercise(deletingExercise!);
          setDeletingExercise(null);
        }}
      />
      <ExerciseAnimationModal csvId={animatingCsvId} onClose={() => setAnimatingCsvId(null)} />
    </SafeAreaView>
  );
}

function ExerciseRow({ exercise, expanded, onToggle, onEdit, onDelete, onShowAnimation }: {
  exercise: Exercise;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShowAnimation: () => void;
}) {
  const { t, i18n } = useTranslation('explore');
  const locale = i18n.language;
  const muscle = exercise.primary_muscles.length > 0
    ? getMuscleLabels(exercise.primary_muscles, locale).join(', ')
    : t('exercise');

  return (
    <View style={{
      backgroundColor: 'rgba(24,24,27,0.4)',
      borderWidth: 1,
      borderColor: expanded ? 'rgba(63,63,70,0.8)' : 'rgba(39,39,42,0.5)',
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      {/* Main row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
        <ExerciseThumbnail
          csvId={exercise.csv_id}
          size={64}
          onPress={hasExerciseAnimation(exercise.csv_id) ? onShowAnimation : undefined}
        />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ color: '#f4f4f5', fontSize: 14, fontWeight: '700' }}>{getExerciseDisplayName(exercise, locale)}</Text>
          <Text style={{ color: '#52525b', fontSize: 12, marginTop: 4 }}>
            {muscle}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onToggle}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: expanded ? '#3f3f46' : '#27272a', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name={expanded ? 'remove' : 'add'} size={18} color="#d4d4d8" />
        </TouchableOpacity>
      </View>

      {/* Expanded detail panel */}
      {expanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: '#27272a', paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>

          {exercise.primary_muscles.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Text style={{ color: '#52525b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, width: 72, paddingTop: 4 }}>{t('primary')}</Text>
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {exercise.primary_muscles.map((m) => (
                  <View key={m} style={{ backgroundColor: '#1c1c1f', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: '#d4d4d8', fontSize: 12 }}>{getMuscleLabel(m, locale)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {exercise.secondary_muscles.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Text style={{ color: '#52525b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, width: 72, paddingTop: 4 }}>{t('secondary')}</Text>
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {exercise.secondary_muscles.map((m) => (
                  <View key={m} style={{ backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: '#71717a', fontSize: 12 }}>{getMuscleLabel(m, locale)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {exercise.equipment.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Text style={{ color: '#52525b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, width: 72, paddingTop: 4 }}>{t('equipment')}</Text>
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {exercise.equipment.map((eq) => (
                  <View key={eq} style={{ backgroundColor: '#1c1c1f', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: '#d4d4d8', fontSize: 12 }}>{getEquipmentLabel(eq, locale)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!!exercise.description && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Text style={{ color: '#52525b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, width: 72, paddingTop: 2 }}>{t('notes')}</Text>
              <Text style={{ flex: 1, color: '#71717a', fontSize: 13, lineHeight: 18 }}>{exercise.description}</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TouchableOpacity
              onPress={onEdit}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
            >
              <Ionicons name="pencil-outline" size={14} color="#a1a1aa" />
              <Text style={{ color: '#a1a1aa', fontSize: 13, fontWeight: '600' }}>{t('common:edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onDelete}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
            >
              <Ionicons name="trash-outline" size={14} color="#ef4444" />
              <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>{t('common:delete')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
