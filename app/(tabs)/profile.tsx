import { View, Text, ScrollView, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useSplit } from '../hooks/useSplit';
import { useWeightUnit } from '../hooks/useWeightUnit';
import { useWorkoutPreferences } from '../hooks/useWorkoutPreferences';
import { compressMuscles } from '../constants/splits';
import WorkoutPrefsEditor from '../components/WorkoutPrefsEditor';
import ConfirmModal from '../components/ConfirmModal';
import { deleteAllWorkouts, getFinishedWorkoutCount } from '../db/workouts';
import { deleteAllSeedExercises, deleteAllUserExercises } from '../db/exercises';
import { getTotalVolume } from '../db/sets';

export default function ProfileScreen() {
  const router = useRouter();
  const { split, reload } = useSplit();
  const { unit, update: updateUnit, reload: reloadUnit } = useWeightUnit();
  const { prefs, update: updatePrefs, reload: reloadPrefs } = useWorkoutPreferences();
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDeleteSeedExercisesModal, setShowDeleteSeedExercisesModal] = useState(false);
  const [showDeleteUserExercisesModal, setShowDeleteUserExercisesModal] = useState(false);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);

  useFocusEffect(useCallback(() => {
    reload(); reloadUnit(); reloadPrefs();
    Promise.all([getFinishedWorkoutCount(), getTotalVolume()]).then(([count, volume]) => {
      setWorkoutCount(count);
      setTotalVolume(volume);
    });
  }, [reload, reloadUnit, reloadPrefs]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: '#18181b' }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', letterSpacing: -0.3 }}>Profile</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
      >
        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 24, marginBottom: 32 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(24,24,27,0.6)', borderWidth: 1, borderColor: 'rgba(39,39,42,0.8)', borderRadius: 16, padding: 16, height: 112, justifyContent: 'space-between' }}>
            <Ionicons name="trending-up-outline" size={20} color="#71717a" />
            <View>
              <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900' }}>{workoutCount}</Text>
              <Text style={{ color: '#52525b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 }}>Workouts</Text>
            </View>
          </View>

          <View style={{ flex: 1, backgroundColor: 'rgba(24,24,27,0.6)', borderWidth: 1, borderColor: 'rgba(39,39,42,0.8)', borderRadius: 16, padding: 16, height: 112, justifyContent: 'space-between' }}>
            <MaterialCommunityIcons name="dumbbell" size={20} color="#71717a" />
            <View>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>
                {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : String(totalVolume)}
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#71717a' }}> {unit}</Text>
              </Text>
              <Text style={{ color: '#52525b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 }}>Total Volume</Text>
            </View>
          </View>
        </View>

        {/* Training Split */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: '#f4f4f5', fontSize: 18, fontWeight: '600' }}>Training Split</Text>
          <TouchableOpacity onPress={() => router.push('/edit-split')}>
            <Text style={{ color: '#71717a', fontSize: 14, fontWeight: '500' }}>Edit</Text>
          </TouchableOpacity>
        </View>

        {split ? (
          <View style={{
            backgroundColor: 'rgba(24,24,27,0.6)',
            borderWidth: 1,
            borderColor: 'rgba(39,39,42,0.8)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 32,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ color: '#f4f4f5', fontSize: 15, fontWeight: '700' }}>{split.name}</Text>
              <View style={{ backgroundColor: '#27272a', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#71717a', fontSize: 12, fontWeight: '600' }}>
                  {split.days.length} {split.days.length === 1 ? 'day' : 'days'}
                </Text>
              </View>
            </View>
            <View style={{ gap: 8 }}>
              {split.days.map((day, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center',
                    marginTop: 1,
                  }}>
                    <Text style={{ color: '#71717a', fontSize: 10, fontWeight: '700' }}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#f4f4f5', fontSize: 13, fontWeight: '600', marginBottom: 3 }}>{day.name}</Text>
                    <Text style={{ color: '#52525b', fontSize: 12, lineHeight: 17 }} numberOfLines={2}>
                      {compressMuscles(day.muscles).map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(' · ')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/edit-split')}
            style={{
              backgroundColor: 'rgba(24,24,27,0.6)',
              borderWidth: 1,
              borderColor: 'rgba(39,39,42,0.8)',
              borderRadius: 16,
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              marginBottom: 32,
            }}
          >
            <Ionicons name="add-circle-outline" size={22} color="#71717a" />
            <Text style={{ color: '#71717a', fontSize: 14, fontWeight: '500' }}>Set up your training split</Text>
          </TouchableOpacity>
        )}

        {/* Preferences */}
        <Text style={{ color: '#f4f4f5', fontSize: 18, fontWeight: '600', marginBottom: 16 }}>Preferences</Text>
        <View style={{ backgroundColor: 'rgba(24,24,27,0.6)', borderWidth: 1, borderColor: 'rgba(39,39,42,0.8)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <Text style={{ color: '#52525b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>Weight Unit</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['kg', 'lbs'] as const).map((u) => {
              const selected = unit === u;
              return (
                <TouchableOpacity
                  key={u}
                  onPress={() => updateUnit(u)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: selected ? '#f4f4f5' : '#27272a',
                    borderWidth: 1,
                    borderColor: selected ? '#f4f4f5' : '#3f3f46',
                  }}
                >
                  <Text style={{ color: selected ? '#09090b' : '#71717a', fontSize: 15, fontWeight: '700' }}>{u}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {prefs && (
          <View style={{ marginBottom: 32 }}>
            <WorkoutPrefsEditor
              prefs={prefs}
              onChange={(next) => updatePrefs(next)}
            />
          </View>
        )}

        {/* Danger zone */}
        <Text style={{ color: '#f4f4f5', fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 16 }}>Danger Zone</Text>
        <TouchableOpacity
          onPress={() => setShowDeleteAllModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: 'rgba(239,68,68,0.08)',
            borderWidth: 1,
            borderColor: 'rgba(239,68,68,0.25)',
            borderRadius: 14,
            padding: 16,
            marginBottom: 8,
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
          <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '600' }}>Delete All Workouts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowDeleteSeedExercisesModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: 'rgba(239,68,68,0.08)',
            borderWidth: 1,
            borderColor: 'rgba(239,68,68,0.25)',
            borderRadius: 14,
            padding: 16,
            marginBottom: 8,
          }}
        >
          <Ionicons name="library-outline" size={20} color="#ef4444" />
          <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '600' }}>Delete Pre-loaded Exercises</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowDeleteUserExercisesModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: 'rgba(239,68,68,0.08)',
            borderWidth: 1,
            borderColor: 'rgba(239,68,68,0.25)',
            borderRadius: 14,
            padding: 16,
            marginBottom: 8,
          }}
        >
          <Ionicons name="person-outline" size={20} color="#ef4444" />
          <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '600' }}>Delete My Custom Exercises</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmModal
        visible={showDeleteAllModal}
        title="Delete All Workouts"
        message="This will permanently delete all your workout history and sets. This cannot be undone."
        confirmLabel="Delete All"
        destructive
        onCancel={() => setShowDeleteAllModal(false)}
        onConfirm={() => { setShowDeleteAllModal(false); deleteAllWorkouts(); }}
      />

      <ConfirmModal
        visible={showDeleteSeedExercisesModal}
        title="Delete Pre-loaded Exercises"
        message="This will permanently delete all built-in exercises. Your custom exercises will not be affected."
        confirmLabel="Delete"
        destructive
        onCancel={() => setShowDeleteSeedExercisesModal(false)}
        onConfirm={() => { setShowDeleteSeedExercisesModal(false); deleteAllSeedExercises(); }}
      />

      <ConfirmModal
        visible={showDeleteUserExercisesModal}
        title="Delete My Custom Exercises"
        message="This will permanently delete all exercises you have created. Pre-loaded exercises will not be affected."
        confirmLabel="Delete"
        destructive
        onCancel={() => setShowDeleteUserExercisesModal(false)}
        onConfirm={() => { setShowDeleteUserExercisesModal(false); deleteAllUserExercises(); }}
      />
    </SafeAreaView>
  );
}
