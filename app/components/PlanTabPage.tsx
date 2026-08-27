import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoutines } from '../hooks/useRoutines';
import ConfirmModal from './ConfirmModal';
import type { Routine } from '../db/routines';
import { C, accent } from '../theme/colors';

export default function PlanTabPage() {
  const { t } = useTranslation('routines');
  const router = useRouter();
  const { routines, isLoading, removeRoutine, reload } = useRoutines();
  const [deletingRoutine, setDeletingRoutine] = useState<Routine | null>(null);

  // Reload when this route regains focus (picks up creates/edits from edit-routine)
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: C.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.3 }}>{t('navigation:plan')}</Text>
          <TouchableOpacity
            onPress={() => router.push('/edit-routine')}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: accent.blue }}
          >
            <Ionicons name="add" size={22} color={accent.blue} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={C.textMuted} style={{ marginTop: 48 }} />
      ) : routines.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Ionicons name="list-outline" size={48} color={C.textDim} style={{ marginBottom: 16 }} />
          <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>{t('noRoutinesYet')}</Text>
          <Text style={{ color: C.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
            {t('routinesTabHint')}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/edit-routine')}
            style={{ marginTop: 24, backgroundColor: C.text, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 }}
          >
            <Text style={{ color: '#09090b', fontSize: 15, fontWeight: '700' }}>{t('createRoutine')}</Text>
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
        title={t('deleteRoutineTitle')}
        message={t('deleteRoutineMessage', { name: deletingRoutine?.name ?? '' })}
        confirmLabel={t('common:delete')}
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
  const { t } = useTranslation('routines');
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
          {count === 0 ? t('noExercises') : t('explore:exerciseCount', { count })}
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
