import { View, Text, TouchableOpacity } from 'react-native';
import type { WorkoutPreferences } from '../storage';

type Props = {
  prefs: WorkoutPreferences;
  onChange: (prefs: WorkoutPreferences) => void;
};

type Field = keyof WorkoutPreferences;

const EXERCISE_ROWS: { label: string; field: Field }[] = [
  { label: 'Compound', field: 'compound_exercises' },
  { label: 'Accessory', field: 'accessory_exercises' },
  { label: 'Isolation', field: 'isolation_exercises' },
];

export default function WorkoutPrefsEditor({ prefs, onChange }: Props) {
  const set = (field: Field, value: number) =>
    onChange({ ...prefs, [field]: Math.max(0, Math.min(10, value)) });

  return (
    <View style={{ gap: 24 }}>
      <Section label="Exercises per workout" rows={EXERCISE_ROWS} prefs={prefs} onSet={set} />
      <View>
        <Text style={{ color: '#52525b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
          Progressive Overload
        </Text>
        <View style={{ backgroundColor: 'rgba(24,24,27,0.6)', borderWidth: 1, borderColor: 'rgba(39,39,42,0.8)', borderRadius: 16, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
            <Text style={{ color: '#f4f4f5', fontSize: 15, fontWeight: '600' }}>Progress Reps</Text>
            <Stepper
              value={prefs.progress_reps}
              onDecrement={() => onChange({ ...prefs, progress_reps: Math.max(1, prefs.progress_reps - 1) })}
              onIncrement={() => onChange({ ...prefs, progress_reps: Math.min(20, prefs.progress_reps + 1) })}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function Section({
  label,
  rows,
  prefs,
  onSet,
}: {
  label: string;
  rows: { label: string; field: Field }[];
  prefs: WorkoutPreferences;
  onSet: (field: Field, value: number) => void;
}) {
  return (
    <View>
      <Text style={{ color: '#52525b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
        {label}
      </Text>
      <View style={{ backgroundColor: 'rgba(24,24,27,0.6)', borderWidth: 1, borderColor: 'rgba(39,39,42,0.8)', borderRadius: 16, overflow: 'hidden' }}>
        {rows.map(({ label: rowLabel, field }, idx) => (
          <View
            key={field}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderTopWidth: idx === 0 ? 0 : 1,
              borderTopColor: '#27272a',
            }}
          >
            <Text style={{ color: '#f4f4f5', fontSize: 15, fontWeight: '600' }}>{rowLabel}</Text>
            <Stepper value={prefs[field]} onDecrement={() => onSet(field, prefs[field] - 1)} onIncrement={() => onSet(field, prefs[field] + 1)} />
          </View>
        ))}
      </View>
    </View>
  );
}

function Stepper({ value, onDecrement, onIncrement }: { value: number; onDecrement: () => void; onIncrement: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <TouchableOpacity
        onPress={onDecrement}
        activeOpacity={0.7}
        style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#f4f4f5', fontSize: 18, fontWeight: '400', lineHeight: 20 }}>−</Text>
      </TouchableOpacity>
      <Text style={{ color: '#f4f4f5', fontSize: 17, fontWeight: '700', width: 28, textAlign: 'center' }}>{value}</Text>
      <TouchableOpacity
        onPress={onIncrement}
        activeOpacity={0.7}
        style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#f4f4f5', fontSize: 18, fontWeight: '400', lineHeight: 20 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
