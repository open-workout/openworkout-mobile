import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Exercise } from '../db/exercises';
import { SetRow, type LocalSet } from './SetRows';
import { OverloadHint } from './OverloadHint';
import type { OverloadSuggestion } from '../lib/progressiveOverload';
import { getExerciseDisplayName, getMuscleLabels } from '../lib/exerciseTranslations';
import { C, accent } from '../theme/colors';

type Props = {
  slotType: string;
  exercise: Exercise;
  sets: LocalSet[];
  suggestion: OverloadSuggestion | null;
  weightUnit: 'kg' | 'lbs';
  removeMode: boolean;
  selectedForRemoval: Set<string>;
  onSwitch: () => void;
  onDelete: () => void;
  onSetWeightChange: (setId: string, value: string) => void;
  onSetSecondaryChange: (setId: string, value: string) => void;
  onSetBlur: (setId: string) => void;
  onToggleChecked: (setId: string) => void;
  onToggleSelectForRemoval: (setId: string) => void;
  onAddWarmupSet: () => void;
  onAddSet: () => void;
  onEnterRemoveMode: () => void;
  onCancelRemoveMode: () => void;
  onConfirmRemove: () => void;
  onGenerateSets: () => void;
};

// The single-exercise pane shown below the horizontal exercise tab strip
// during an active workout — always expanded (no accordion state) since
// only one exercise is visible at a time.
export function ExerciseCard({
  slotType,
  exercise,
  sets,
  suggestion,
  weightUnit,
  removeMode,
  selectedForRemoval,
  onSwitch,
  onDelete,
  onSetWeightChange,
  onSetSecondaryChange,
  onSetBlur,
  onToggleChecked,
  onToggleSelectForRemoval,
  onAddWarmupSet,
  onAddSet,
  onEnterRemoveMode,
  onCancelRemoveMode,
  onConfirmRemove,
  onGenerateSets,
}: Props) {
  const { t, i18n } = useTranslation('workout');
  const locale = i18n.language;
  const muscles = getMuscleLabels(exercise.primary_muscles, locale).join(', ');
  const loggingType = exercise.logging_type === 'time' ? 'time' : 'reps';
  const canSwitch = sets.every((s) => s.loggedAt === null);

  return (
    <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.borderAlt, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 16, paddingBottom: 8, gap: 12 }}>
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
          {canSwitch && (
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
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 10 }}>
        <TouchableOpacity
          onPress={() => Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(exercise.name + ' exercise')}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4 }}
        >
          <Ionicons name="search-outline" size={13} color={C.textDim} />
          <Text style={{ color: C.textDim, fontSize: 12, fontWeight: '600' }}>{t('search')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: C.border }}>
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
          <View style={{ width: 26 }} />
          {[weightUnit.toUpperCase(), loggingType === 'time' ? t('durationHeader') : t('repsHeader')].map((h) => (
            <Text key={h} style={{ flex: 1, textAlign: 'center', color: C.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>{h}</Text>
          ))}
          <View style={{ width: 28 }} />
        </View>

        {suggestion && <OverloadHint label={suggestion.label} />}

        {sets.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
            <Text style={{ color: C.textDim, fontSize: 14 }}>{t('noSetsYet')}</Text>
            <TouchableOpacity
              onPress={onGenerateSets}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#141414', borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 9 }}
            >
              <Ionicons name="refresh-outline" size={15} color={C.text} />
              <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>{t('generateSets')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sets.map((set) => (
            <SetRow
              key={set.id}
              set={set}
              loggingType={loggingType}
              onWeightChange={(v) => onSetWeightChange(set.id, v)}
              onSecondaryChange={(v) => onSetSecondaryChange(set.id, v)}
              onBlur={() => onSetBlur(set.id)}
              onToggleChecked={() => onToggleChecked(set.id)}
              selectionMode={removeMode}
              selected={selectedForRemoval.has(set.id)}
              onToggleSelect={() => onToggleSelectForRemoval(set.id)}
            />
          ))
        )}

        <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: C.border }}>
          {removeMode ? (
            <>
              <TouchableOpacity
                onPress={onCancelRemoveMode}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border }}
              >
                <Text style={{ color: C.textMuted, fontSize: 13, fontWeight: '700' }}>{t('common:cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onConfirmRemove}
                disabled={selectedForRemoval.size === 0}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: selectedForRemoval.size === 0 ? '#27272a' : 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: selectedForRemoval.size === 0 ? C.border : accent.red }}
              >
                <Text style={{ color: selectedForRemoval.size === 0 ? C.textDim : accent.red, fontSize: 13, fontWeight: '700' }}>
                  {t('removeSelected', { count: selectedForRemoval.size })}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={onAddWarmupSet}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border }}
              >
                <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '700' }}>{t('addWarmupSet')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onAddSet}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border }}
              >
                <Text style={{ color: C.text, fontSize: 12, fontWeight: '700' }}>{t('addSet')}</Text>
              </TouchableOpacity>
              {sets.length > 0 && (
                <TouchableOpacity
                  onPress={onEnterRemoveMode}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border }}
                >
                  <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '700' }}>{t('removeSet')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}
