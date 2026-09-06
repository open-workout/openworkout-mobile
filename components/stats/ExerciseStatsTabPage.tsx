import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExercisePickerModal } from './ExercisePickerModal';
import { C, accent } from '../../theme/colors';
import type { Exercise } from '../../db/exercises';

export default function ExerciseStatsTabPage() {
  const { t } = useTranslation('stats');
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);

  const handleSelect = (exercise: Exercise) => {
    if (!exercise.id) return;
    router.push(`/exercise-stats?exerciseId=${exercise.id}`);
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.card, borderWidth: 1, borderColor: accent.purple, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="analytics-outline" size={24} color={accent.purple} />
      </View>
      <Text style={{ color: C.textDim, fontSize: 15, textAlign: 'center' }}>{t('pickExercisePrompt')}</Text>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: accent.purple, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 }}
      >
        <Ionicons name="search" size={16} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{t('pickExerciseCta')}</Text>
      </TouchableOpacity>

      <ExercisePickerModal visible={showPicker} onClose={() => setShowPicker(false)} onSelect={handleSelect} />
    </View>
  );
}
