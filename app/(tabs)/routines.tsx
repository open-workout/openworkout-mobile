import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useRoutines } from '../hooks/useRoutines';
import ConfirmModal from '../components/ConfirmModal';
import type { Routine } from '../db/routines';

const C = {
  bg: '#0a0a0a',
  card: '#18181b',
  border: '#27272a',
  text: '#f4f4f5',
  textMuted: '#71717a',
  textDim: '#52525b',
};

export default function RoutinesScreen() {
  const router = useRouter();
  const { routines, isLoading, removeRoutine, reload } = useRoutines();
  const [deletingRoutine, setDeletingRoutine] = useState<Routine | null>(null);

  // Reload when tab regains focus (picks up creates/edits from edit-routine)
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: C.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.3 }}>Routines</Text>
          <TouchableOpacity
            onPress={() => router.push('/edit-routine')}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
          >
            <Ionicons name="add" size={22} color={C.text} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={C.textMuted} style={{ marginTop: 48 }} />
      ) : routines.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Ionicons name="list-outline" size={48} color={C.textDim} style={{ marginBottom: 16 }} />
          <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>No routines yet</Text>
          <Text style={{ color: C.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
            Create a routine to save a set of exercises and quickly start a workout from it.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/edit-routine')}
            style={{ marginTop: 24, backgroundColor: C.text, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 }}
          >
            <Text style={{ color: '#09090b', fontSize: 15, fontWeight: '700' }}>Create routine</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {routines.map((routine) => (
            <RoutineRow
              key={routine.id}
              routine={routine}
              onEdit={() => router.push({ pathname: '/edit-routine', params: { routineId: routine.id } })}
              onDelete={() => setDeletingRoutine(routine)}
            />
          ))}
        </ScrollView>
      )}

      <ConfirmModal
        visible={deletingRoutine !== null}
        title="Delete Routine"
        message={`Remove "${deletingRoutine?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (deletingRoutine) await removeRoutine(deletingRoutine.id);
          setDeletingRoutine(null);
        }}
        onCancel={() => setDeletingRoutine(null)}
      />
    </SafeAreaView>
  );
}

function RoutineRow({
  routine,
  onEdit,
  onDelete,
}: {
  routine: Routine;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const count = routine.exercise_ids.length;
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onEdit}
      style={{
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{routine.name}</Text>
        <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 3 }}>
          {count === 0 ? 'No exercises' : count === 1 ? '1 exercise' : `${count} exercises`}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{ marginRight: 12 }}
      >
        <Ionicons name="trash-outline" size={18} color={C.textDim} />
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={18} color={C.textDim} />
    </TouchableOpacity>
  );
}
