import { View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';

type SetData = {
  id: number;
  exerciseId: number;
  weight: string;
  unit: 'kg' | 'lbs';
  reps: string;
  difficulty: number | null;
  loggedAt: Date | null;
};

const initialSets: SetData[] = [
  { id: 1, exerciseId: 1, weight: '60', unit: 'kg', reps: '10', difficulty: null, loggedAt: new Date() },
  { id: 2, exerciseId: 1, weight: '80', unit: 'kg', reps: '', difficulty: null, loggedAt: null },
  { id: 3, exerciseId: 1, weight: '', unit: 'kg', reps: '', difficulty: null, loggedAt: null },
];

export default function WorkoutScreen() {
  const router = useRouter();
  const [sets, setSets] = useState<SetData[]>(initialSets);

  const logSet = (id: number) => {
    setSets((prev) => prev.map((s) => s.id === id ? { ...s, loggedAt: s.loggedAt ? null : new Date() } : s));
  };

  const addSet = () => {
    setSets((prev) => [...prev, { id: prev.length + 1, exerciseId: 1, weight: '', unit: 'kg', reps: '', difficulty: null, loggedAt: null }]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0c0c0e', borderBottomWidth: 1, borderBottomColor: '#18181b' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-down" size={26} color="#71717a" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Text style={{ color: '#34d399', fontFamily: 'monospace', fontSize: 18, fontWeight: '600', letterSpacing: 2 }}>12:45</Text>
          <TouchableOpacity style={{ backgroundColor: '#f4f4f5', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 7 }}>
            <Text style={{ color: '#09090b', fontWeight: '700', fontSize: 14 }}>Finish</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Workout name */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
          <TextInput
            defaultValue="Evening Workout"
            style={{ color: '#fff', fontSize: 24, fontWeight: '700', backgroundColor: 'transparent' }}
          />
          <Text style={{ color: '#52525b', fontSize: 14, marginTop: 4 }}>Volume: 3,240 kg • 2 exercises</Text>
        </View>

        {/* Exercise block */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 12 }}>
            <Text style={{ color: '#34d399', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              1. Barbell Bench Press
            </Text>
            <TouchableOpacity>
              <Ionicons name="ellipsis-horizontal" size={20} color="#71717a" />
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: 'rgba(24,24,27,0.6)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(39,39,42,0.8)', overflow: 'hidden' }}>
            {/* Table header */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
              {['SET', 'KG', 'REPS', '✓'].map((h) => (
                <Text key={h} style={{ flex: 1, textAlign: 'center', color: '#52525b', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>{h}</Text>
              ))}
            </View>

            {sets.map((set, i) => (
              <SetRow key={set.id} set={set} index={i} onToggle={() => logSet(set.id)} />
            ))}

            <TouchableOpacity
              onPress={addSet}
              style={{ paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(39,39,42,0.5)', backgroundColor: 'rgba(24,24,27,0.3)' }}
            >
              <Text style={{ color: '#71717a', fontSize: 14, fontWeight: '600' }}>+ Add Set</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add exercise */}
        <View style={{ paddingHorizontal: 24, marginTop: 8 }}>
          <TouchableOpacity style={{ paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: '#27272a', borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <Ionicons name="add" size={18} color="#52525b" />
            <Text style={{ color: '#52525b', fontWeight: '600', fontSize: 15 }}>Add Exercise</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SetRow({ set, index, onToggle }: { set: SetData; index: number; onToggle: () => void }) {
  const logged = set.loggedAt !== null;
  const bg = logged ? 'rgba(16,185,129,0.06)' : index % 2 === 0 ? 'rgba(39,39,42,0.15)' : 'transparent';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: bg, borderTopWidth: 1, borderTopColor: 'rgba(39,39,42,0.5)', position: 'relative' }}>
      {logged && (
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: '#10b981' }} />
      )}
      <Text style={{ flex: 1, textAlign: 'center', color: '#71717a', fontSize: 14, fontWeight: '500' }}>{set.id}</Text>
      <View style={{ flex: 1 }}>
        <TextInput
          defaultValue={set.weight}
          placeholder="—"
          placeholderTextColor="#3f3f46"
          keyboardType="numeric"
          style={{ backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 8, paddingVertical: 8, textAlign: 'center', color: '#fff', fontWeight: '500', fontSize: 14 }}
        />
      </View>
      <View style={{ flex: 1 }}>
        <TextInput
          defaultValue={set.reps}
          placeholder="—"
          placeholderTextColor="#3f3f46"
          keyboardType="numeric"
          style={{ backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 8, paddingVertical: 8, textAlign: 'center', color: '#fff', fontWeight: '500', fontSize: 14 }}
        />
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={onToggle}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: logged ? '#10b981' : '#27272a',
            borderWidth: 1,
            borderColor: logged ? '#34d399' : '#3f3f46',
            shadowColor: logged ? '#10b981' : 'transparent',
            shadowOpacity: logged ? 0.3 : 0,
            shadowRadius: 8,
          }}
        >
          <Ionicons name="checkmark" size={16} color={logged ? '#0a0a0a' : '#52525b'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
