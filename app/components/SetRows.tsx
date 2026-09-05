import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Exercise } from '../db/exercises';
import { accent } from '../theme/colors';

export type MeasurementType = 'reps' | 'time' | 'distance';

export type LocalSet = {
  id: string;
  weight: string;
  reps: string;
  durationSeconds: string;
  distance: string;
  unit: 'kg' | 'lbs';
  measurementType: MeasurementType;
  loggedAt: Date | null;
  isWarmup: boolean;
  position: number;
  dropSetNumber: number;
};

// Which of reps/time/distance this exercise supports, in priority order —
// the first one is what a new set defaults to.
export function availableMeasurementTypes(exercise: Exercise): MeasurementType[] {
  const types: MeasurementType[] = [];
  if (exercise.can_be_done_in_reps) types.push('reps');
  if (exercise.can_be_done_in_time) types.push('time');
  if (exercise.can_be_done_in_distance) types.push('distance');
  return types.length ? types : ['reps'];
}

export function defaultMeasurementType(exercise: Exercise): MeasurementType {
  return availableMeasurementTypes(exercise)[0];
}

export function isSetFilled(set: LocalSet, requiresWeight: boolean): boolean {
  const secondary = set.measurementType === 'time' ? set.durationSeconds
    : set.measurementType === 'distance' ? set.distance
    : set.reps;
  const weightOk = !requiresWeight || set.weight.trim().length > 0;
  return weightOk && secondary.trim().length > 0;
}

export function SetRow({
  set,
  requiresWeight,
  onWeightChange,
  onSecondaryChange,
  onBlur,
  onToggleChecked,
  onAddDropSet,
  showDropButton,
  selectionMode,
  selected,
  onToggleSelect,
}: {
  set: LocalSet;
  requiresWeight: boolean;
  onWeightChange: (v: string) => void;
  onSecondaryChange: (v: string) => void;
  onBlur: () => void;
  onToggleChecked: () => void;
  onAddDropSet: () => void;
  showDropButton: boolean;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const { t } = useTranslation('workout');
  const checked = set.loggedAt !== null;
  const canCheck = isSetFilled(set, requiresWeight);
  const secondaryValue = set.measurementType === 'time' ? set.durationSeconds
    : set.measurementType === 'distance' ? set.distance
    : set.reps;
  const secondaryPlaceholder = set.measurementType === 'time' ? 'sec' : set.measurementType === 'distance' ? 'km' : '—';
  const bg = selected ? 'rgba(239,68,68,0.08)' : checked ? 'rgba(16,185,129,0.06)' : 'transparent';
  const isDropSet = set.dropSetNumber > 0;

  return (
    <View style={{ backgroundColor: bg, borderTopWidth: 1, borderTopColor: 'rgba(39,39,42,0.5)', position: 'relative' }}>
      {checked && !selectionMode && (
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: '#10b981' }} />
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: isDropSet ? 40 : 16, paddingRight: isDropSet ? 28 : 16, paddingTop: 12, paddingBottom: selectionMode ? 12 : 4, gap: 8 }}>
        <View style={{ width: 30, alignItems: 'center' }}>
          {set.isWarmup ? (
            <Ionicons name="flame-outline" size={14} color={accent.amber} />
          ) : set.dropSetNumber > 0 ? (
            <Text style={{ color: accent.amber, fontSize: 10, fontWeight: '800' }}>{`D${set.dropSetNumber}`}</Text>
          ) : null}
        </View>
        {requiresWeight && (
          <View style={{ flex: 1 }}>
            <TextInput
              value={set.weight}
              onChangeText={onWeightChange}
              onBlur={onBlur}
              placeholder="—"
              placeholderTextColor="#3f3f46"
              keyboardType="numeric"
              editable={!selectionMode}
              style={{ backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 8, paddingVertical: 8, textAlign: 'center', color: '#fff', fontWeight: '500', fontSize: 14 }}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <TextInput
            value={secondaryValue}
            onChangeText={onSecondaryChange}
            onBlur={onBlur}
            placeholder={secondaryPlaceholder}
            placeholderTextColor="#3f3f46"
            keyboardType="numeric"
            editable={!selectionMode}
            style={{ backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 8, paddingVertical: 8, textAlign: 'center', color: '#fff', fontWeight: '500', fontSize: 14 }}
          />
        </View>
        <TouchableOpacity
          onPress={selectionMode ? onToggleSelect : onToggleChecked}
          style={{ width: 28, alignItems: 'center' }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {selectionMode ? (
            <Ionicons
              name={selected ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={selected ? accent.red : '#52525b'}
            />
          ) : (
            <Ionicons
              name={checked ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={checked ? accent.green : canCheck ? '#71717a' : '#3f3f46'}
            />
          )}
        </TouchableOpacity>
      </View>
      {!selectionMode && showDropButton && (
        <TouchableOpacity
          onPress={onAddDropSet}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: isDropSet ? 62 : 38, paddingRight: 16, paddingBottom: 10 }}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 8 }}
        >
          <Ionicons name="trending-down-outline" size={12} color={accent.amber} />
          <Text style={{ color: accent.amber, fontSize: 11, fontWeight: '700' }}>{t('dropSet')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
