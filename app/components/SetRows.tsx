import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type LoggingType = 'reps' | 'time';

export type LocalSet = {
  id: string;
  weight: string;
  reps: string;
  durationSeconds: string;
  unit: 'kg' | 'lbs';
  loggedAt: Date | null;
};

export function SetRow({ set, loggingType, onWeightChange, onSecondaryChange, onBlur, onDelete }: {
  set: LocalSet;
  loggingType: LoggingType;
  onWeightChange: (v: string) => void;
  onSecondaryChange: (v: string) => void;
  onBlur: () => void;
  onDelete: () => void;
}) {
  const logged = set.loggedAt !== null;
  const bg = logged ? 'rgba(16,185,129,0.06)' : 'transparent';
  const secondaryValue = loggingType === 'time' ? set.durationSeconds : set.reps;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: bg, borderTopWidth: 1, borderTopColor: 'rgba(39,39,42,0.5)', position: 'relative' }}>
      {logged && (
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: '#10b981' }} />
      )}
      <View style={{ flex: 1 }}>
        <TextInput
          value={set.weight}
          onChangeText={onWeightChange}
          onBlur={onBlur}
          placeholder="—"
          placeholderTextColor="#3f3f46"
          keyboardType="numeric"
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
          style={{ backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 8, paddingVertical: 8, textAlign: 'center', color: '#fff', fontWeight: '500', fontSize: 14 }}
        />
      </View>
      <TouchableOpacity onPress={onDelete} style={{ width: 28, alignItems: 'center' }}>
        <Ionicons name="remove-circle-outline" size={18} color="#52525b" />
      </TouchableOpacity>
    </View>
  );
}

export function DraftSetRow({ weight, secondaryValue, loggingType, onWeightChange, onSecondaryChange, onConfirm }: {
  weight: string;
  secondaryValue: string;
  loggingType: LoggingType;
  onWeightChange: (v: string) => void;
  onSecondaryChange: (v: string) => void;
  onConfirm: () => void;
}) {
  const canConfirm = weight.trim().length > 0 && secondaryValue.trim().length > 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(39,39,42,0.5)' }}>
      <View style={{ flex: 1 }}>
        <TextInput
          value={weight}
          onChangeText={onWeightChange}
          placeholder="—"
          placeholderTextColor="#3f3f46"
          keyboardType="numeric"
          style={{ backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 8, paddingVertical: 8, textAlign: 'center', color: '#fff', fontWeight: '500', fontSize: 14 }}
        />
      </View>
      <View style={{ flex: 1 }}>
        <TextInput
          value={secondaryValue}
          onChangeText={onSecondaryChange}
          placeholder={loggingType === 'time' ? 'sec' : '—'}
          placeholderTextColor="#3f3f46"
          keyboardType="numeric"
          style={{ backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 8, paddingVertical: 8, textAlign: 'center', color: '#fff', fontWeight: '500', fontSize: 14 }}
        />
      </View>
      <TouchableOpacity
        onPress={onConfirm}
        disabled={!canConfirm}
        style={{ width: 28, alignItems: 'center' }}
      >
        <Ionicons name="add-circle" size={22} color={canConfirm ? '#34d399' : '#3f3f46'} />
      </TouchableOpacity>
    </View>
  );
}
