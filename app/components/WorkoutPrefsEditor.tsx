import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WorkoutPreferences } from '../storage';
import InfoModal from './InfoModal';

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

const FIELD_INFO: Record<Field, { title: string; message: string }> = {
  compound_exercises: {
    title: 'Compound',
    message:
      "Compound exercises work multiple muscle groups and joints at once (e.g. squats, bench press, deadlifts). They're the foundation of most sessions.",
  },
  accessory_exercises: {
    title: 'Accessory',
    message:
      "Accessory exercises support your main lifts by targeting supporting muscle groups (e.g. rows, lunges, dips). They round out a session and help fix weak points.",
  },
  isolation_exercises: {
    title: 'Isolation',
    message:
      "Isolation exercises target a single muscle and joint (e.g. bicep curls, leg extensions). They're used to build size or address specific weaknesses.",
  },
  progress_reps: {
    title: 'Progress Reps',
    message:
      'The rep target that triggers a weight increase. Once you hit this many reps on a set, the app suggests adding weight next time — until then, it suggests adding reps.',
  },
};

export default function WorkoutPrefsEditor({ prefs, onChange }: Props) {
  const [infoField, setInfoField] = useState<Field | null>(null);

  const set = (field: Field, value: number) =>
    onChange({ ...prefs, [field]: Math.max(0, Math.min(10, value)) });

  return (
    <View style={{ gap: 24 }}>
      <Section label="Exercises per workout" rows={EXERCISE_ROWS} prefs={prefs} onSet={set} onInfo={setInfoField} />
      <View>
        <Text style={{ color: '#52525b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
          Progressive Overload
        </Text>
        <View style={{ backgroundColor: 'rgba(24,24,27,0.6)', borderWidth: 1, borderColor: 'rgba(39,39,42,0.8)', borderRadius: 16, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
            <RowLabel label="Progress Reps" field="progress_reps" onInfo={setInfoField} />
            <Stepper
              value={prefs.progress_reps}
              onDecrement={() => onChange({ ...prefs, progress_reps: Math.max(1, prefs.progress_reps - 1) })}
              onIncrement={() => onChange({ ...prefs, progress_reps: Math.min(20, prefs.progress_reps + 1) })}
            />
          </View>
        </View>
      </View>
      <InfoModal
        visible={infoField !== null}
        title={infoField ? FIELD_INFO[infoField].title : ''}
        message={infoField ? FIELD_INFO[infoField].message : ''}
        onClose={() => setInfoField(null)}
      />
    </View>
  );
}

function Section({
  label,
  rows,
  prefs,
  onSet,
  onInfo,
}: {
  label: string;
  rows: { label: string; field: Field }[];
  prefs: WorkoutPreferences;
  onSet: (field: Field, value: number) => void;
  onInfo: (field: Field) => void;
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
            <RowLabel label={rowLabel} field={field} onInfo={onInfo} />
            <Stepper value={prefs[field]} onDecrement={() => onSet(field, prefs[field] - 1)} onIncrement={() => onSet(field, prefs[field] + 1)} />
          </View>
        ))}
      </View>
    </View>
  );
}

function RowLabel({ label, field, onInfo }: { label: string; field: Field; onInfo: (field: Field) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ color: '#f4f4f5', fontSize: 15, fontWeight: '600' }}>{label}</Text>
      <TouchableOpacity onPress={() => onInfo(field)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="information-circle-outline" size={16} color="#71717a" />
      </TouchableOpacity>
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
