import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Exercise } from '../db/exercises';
import { SetRow, DraftSetRow, type LocalSet } from './SetRows';
import { OverloadHint } from './OverloadHint';
import type { OverloadSuggestion } from '../lib/progressiveOverload';
import { getExerciseDisplayName, getMuscleLabels } from '../lib/exerciseTranslations';

const C = {
  card: '#18181b',
  border: '#27272a',
  borderAlt: '#3f3f46',
  text: '#f4f4f5',
  textMuted: '#71717a',
  textDim: '#52525b',
};

type Props = {
  slotType: string;
  exercise: Exercise;
  isExpanded: boolean;
  sets: LocalSet[];
  draft: { weight: string; reps: string };
  suggestion: OverloadSuggestion | null;
  weightUnit: 'kg' | 'lbs';
  onToggleExpand: () => void;
  onSwitch: () => void;
  onDelete: () => void;
  onDraftWeightChange: (value: string) => void;
  onDraftRepsChange: (value: string) => void;
  onConfirmDraft: () => void;
  onSetWeightChange: (setId: string, value: string) => void;
  onSetRepsChange: (setId: string, value: string) => void;
  onSetBlur: (setId: string) => void;
  onSetDelete: (setId: string) => void;
};

export function ExerciseCard({
  slotType,
  exercise,
  isExpanded,
  sets,
  draft,
  suggestion,
  weightUnit,
  onToggleExpand,
  onSwitch,
  onDelete,
  onDraftWeightChange,
  onDraftRepsChange,
  onConfirmDraft,
  onSetWeightChange,
  onSetRepsChange,
  onSetBlur,
  onSetDelete,
}: Props) {
  const { t, i18n } = useTranslation('workout');
  const locale = i18n.language;
  const muscles = getMuscleLabels(exercise.primary_muscles, locale).join(', ');

  return (
    <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: isExpanded ? C.borderAlt : C.border, marginBottom: 12, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={onToggleExpand}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 16, paddingBottom: 8, gap: 12 }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textDim, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            {t(`explore:addExerciseModal.exerciseTypes.${slotType}.label`, { defaultValue: slotType })}
          </Text>
          <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
            {getExerciseDisplayName(exercise, locale)}
          </Text>
          {!!muscles && (
            <Text style={{ color: C.textMuted, fontSize: 13 }}>
              {muscles}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
          {sets.length === 0 && (
            <TouchableOpacity
              onPress={onSwitch}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#141414', borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 7 }}
            >
              <Ionicons name="swap-horizontal-outline" size={15} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '600' }}>{t('switch')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onDelete}>
            <Ionicons name="trash-outline" size={17} color={C.textDim} />
          </TouchableOpacity>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
        </View>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 10 }}>
        <TouchableOpacity
          onPress={() => Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(exercise.name + ' exercise')}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4 }}
        >
          <Ionicons name="search-outline" size={13} color={C.textDim} />
          <Text style={{ color: C.textDim, fontSize: 12, fontWeight: '600' }}>{t('search')}</Text>
        </TouchableOpacity>
      </View>

      {isExpanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: C.border }}>
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
            {[weightUnit.toUpperCase(), t('repsHeader')].map((h) => (
              <Text key={h} style={{ flex: 1, textAlign: 'center', color: C.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>{h}</Text>
            ))}
            <View style={{ width: 28 }} />
          </View>

          {suggestion && <OverloadHint label={suggestion.label} />}

          <DraftSetRow
            weight={draft.weight}
            reps={draft.reps}
            onWeightChange={onDraftWeightChange}
            onRepsChange={onDraftRepsChange}
            onConfirm={onConfirmDraft}
          />

          {sets.map((set) => (
            <SetRow
              key={set.id}
              set={set}
              onWeightChange={(v) => onSetWeightChange(set.id, v)}
              onRepsChange={(v) => onSetRepsChange(set.id, v)}
              onBlur={() => onSetBlur(set.id)}
              onDelete={() => onSetDelete(set.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
