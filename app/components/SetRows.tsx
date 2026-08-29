import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accent } from '../theme/colors';

export type LoggingType = 'reps' | 'time';

export type LocalSet = {
  id: string;
  weight: string;
  reps: string;
  durationSeconds: string;
  unit: 'kg' | 'lbs';
  loggedAt: Date | null;
  isWarmup: boolean;
  position: number;
};

export function isSetFilled(set: LocalSet, loggingType: LoggingType): boolean {
  const secondary = loggingType === 'time' ? set.durationSeconds : set.reps;
  return set.weight.trim().length > 0 && secondary.trim().length > 0;
}

export function SetRow({
  set,
  loggingType,
  onWeightChange,
  onSecondaryChange,
  onBlur,
  onToggleChecked,
  selectionMode,
  selected,
  onToggleSelect,
}: {
  set: LocalSet;
  loggingType: LoggingType;
  onWeightChange: (v: string) => void;
  onSecondaryChange: (v: string) => void;
  onBlur: () => void;
  onToggleChecked: () => void;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const checked = set.loggedAt !== null;
  const canCheck = isSetFilled(set, loggingType);
  const secondaryValue = loggingType === 'time' ? set.durationSeconds : set.reps;
  const bg = selected ? 'rgba(239,68,68,0.08)' : checked ? 'rgba(16,185,129,0.06)' : 'transparent';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: bg, borderTopWidth: 1, borderTopColor: 'rgba(39,39,42,0.5)', position: 'relative' }}>
      {checked && !selectionMode && (
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: '#10b981' }} />
      )}
      <View style={{ width: 26, alignItems: 'center' }}>
        {set.isWarmup && (
          <Ionicons name="flame-outline" size={14} color={accent.amber} />
        )}
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
            name={checked ? 'checkbox' : 'square-outline'}
            size={22}
            color={checked ? accent.green : canCheck ? '#71717a' : '#3f3f46'}
          />
        )}
      </TouchableOpacity>
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
      <View style={{ flex: 1 }}>
        <TextInput
          value={secondaryValue}
          onChangeText={onSecondaryChange}
          onBlur={onBlur}
          placeholder={loggingType === 'time' ? 'sec' : '—'}
          placeholderTextColor="#3f3f46"
          keyboardType="numeric"
          editable={!selectionMode}
          style={{ backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 8, paddingVertical: 8, textAlign: 'center', color: '#fff', fontWeight: '500', fontSize: 14 }}
        />
      </View>
    </View>
  );
}
