import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { WorkoutPreferences } from '../storage';
import InfoModal from './InfoModal';

type Props = {
  prefs: WorkoutPreferences;
  onChange: (prefs: WorkoutPreferences) => void;
};

type Field = keyof WorkoutPreferences;

const FIELD_INFO_KEY: Record<Field, string> = {
  progress_reps: 'progressRepsInfoMessage',
  weekly_goal: 'weeklyGoalInfoMessage',
  sets_per_exercise: 'setsPerExerciseInfoMessage',
};

export default function WorkoutPrefsEditor({ prefs, onChange }: Props) {
  const { t } = useTranslation('settings');
  const [infoField, setInfoField] = useState<Field | null>(null);

  const fieldTitle = (field: Field): string => {
    if (field === 'progress_reps') return t('workoutPrefs.progressReps');
    if (field === 'weekly_goal') return t('workoutPrefs.weeklyGoal');
    return t('workoutPrefs.setsPerExercise');
  };

  return (
    <View style={{ gap: 24 }}>
      <View>
        <Text style={{ color: '#52525b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
          {t('workoutPrefs.setsPerExercise')}
        </Text>
        <View style={{ backgroundColor: 'rgba(24,24,27,0.6)', borderWidth: 1, borderColor: 'rgba(39,39,42,0.8)', borderRadius: 16, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
            <RowLabel label={t('workoutPrefs.setsPerExercise')} field="sets_per_exercise" onInfo={setInfoField} />
            <Stepper
              value={prefs.sets_per_exercise}
              onDecrement={() => onChange({ ...prefs, sets_per_exercise: Math.max(1, prefs.sets_per_exercise - 1) })}
              onIncrement={() => onChange({ ...prefs, sets_per_exercise: Math.min(10, prefs.sets_per_exercise + 1) })}
            />
          </View>
        </View>
      </View>
      <View>
        <Text style={{ color: '#52525b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
          {t('workoutPrefs.progressiveOverload')}
        </Text>
        <View style={{ backgroundColor: 'rgba(24,24,27,0.6)', borderWidth: 1, borderColor: 'rgba(39,39,42,0.8)', borderRadius: 16, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
            <RowLabel label={t('workoutPrefs.progressReps')} field="progress_reps" onInfo={setInfoField} />
            <Stepper
              value={prefs.progress_reps}
              onDecrement={() => onChange({ ...prefs, progress_reps: Math.max(1, prefs.progress_reps - 1) })}
              onIncrement={() => onChange({ ...prefs, progress_reps: Math.min(20, prefs.progress_reps + 1) })}
            />
          </View>
        </View>
      </View>
      <View>
        <Text style={{ color: '#52525b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
          {t('workoutPrefs.streak')}
        </Text>
        <View style={{ backgroundColor: 'rgba(24,24,27,0.6)', borderWidth: 1, borderColor: 'rgba(39,39,42,0.8)', borderRadius: 16, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
            <RowLabel label={t('workoutPrefs.weeklyGoal')} field="weekly_goal" onInfo={setInfoField} />
            <Stepper
              value={prefs.weekly_goal}
              onDecrement={() => onChange({ ...prefs, weekly_goal: Math.max(1, prefs.weekly_goal - 1) })}
              onIncrement={() => onChange({ ...prefs, weekly_goal: Math.min(7, prefs.weekly_goal + 1) })}
            />
          </View>
        </View>
      </View>
      <InfoModal
        visible={infoField !== null}
        title={infoField ? fieldTitle(infoField) : ''}
        message={infoField ? t(`workoutPrefs.${FIELD_INFO_KEY[infoField]}`) : ''}
        onClose={() => setInfoField(null)}
      />
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
