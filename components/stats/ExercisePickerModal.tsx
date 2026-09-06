import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useExercises } from '../../hooks/useExercises';
import { exerciseMatchesQuery, getExerciseDisplayName, getMuscleLabels } from '../../lib/exerciseTranslations';
import type { Exercise } from '../../db/exercises';
import { C } from '../../theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
};

// Extracted, reusable version of the search+list exercise picker Modal
// pattern already duplicated in generated-workout.tsx and edit-routine.tsx.
export function ExercisePickerModal({ visible, onClose, onSelect }: Props) {
  const { t, i18n } = useTranslation('stats');
  const locale = i18n.language;
  const { exercises } = useExercises();
  const [search, setSearch] = useState('');

  const candidates = useMemo(
    () => exercises.filter((e) => exerciseMatchesQuery(e, search, locale)),
    [exercises, search, locale],
  );

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{t('pickExerciseTitle')}</Text>
          <TouchableOpacity onPress={handleClose} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={24} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border }}>
          <Ionicons name="search" size={16} color={C.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('searchExercisesPlaceholder')}
            placeholderTextColor={C.textDim}
            style={{ flex: 1, color: C.text, fontSize: 15, paddingVertical: 10 }}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
          data={candidates}
          keyExtractor={(ex) => ex.id ?? ex.name}
          initialNumToRender={20}
          windowSize={7}
          ListEmptyComponent={
            <Text style={{ color: C.textDim, fontSize: 14, textAlign: 'center', marginTop: 32 }}>
              {t('noExercisesFound')}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => { onSelect(item); handleClose(); }}
              style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}
            >
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{getExerciseDisplayName(item, locale)}</Text>
              {item.primary_muscles.length > 0 && (
                <Text style={{ color: C.textDim, fontSize: 13, marginTop: 2 }}>
                  {getMuscleLabels(item.primary_muscles, locale).join(', ')}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}
