import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { deleteAllSplits, insertSplit } from './db/splits';
import { useSplit } from './hooks/useSplit';
import { PRESET_SPLITS, type SplitDay } from './constants/splits';
import SplitEditor from './components/SplitEditor';

const C = {
  bg: '#0a0a0a',
  border: '#27272a',
  text: '#f4f4f5',
  textMuted: '#71717a',
};

export default function EditSplitScreen() {
  const router = useRouter();
  const { split, isLoading } = useSplit();

  const matchingPreset = split
    ? PRESET_SPLITS.find(p => p.name === split.name) ?? null
    : null;

  const startInCustom = !!split && !matchingPreset;
  const initialDays: SplitDay[] = startInCustom ? (split?.days ?? []) : [];

  async function handleSave(name: string, days: SplitDay[]) {
    try {
      await deleteAllSplits();
      await insertSplit({ name, days });
    } catch (e) {
      console.error('[handleSave] failed to save split:', e);
    }
    router.back();
  }

  function handleDelete() {
    Alert.alert(
      'Delete Split',
      'Remove your training split? You can set it up again from your profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => { await deleteAllSplits(); router.back(); },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: C.textMuted, fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>Training Split</Text>
        <TouchableOpacity
          onPress={handleDelete}
          disabled={!split}
          style={{ width: 60, alignItems: 'flex-end' }}
        >
          {split && <Ionicons name="trash-outline" size={20} color={C.textMuted} />}
        </TouchableOpacity>
      </View>

      {!isLoading && (
        <SplitEditor
          initialPreset={matchingPreset}
          initialDays={initialDays}
          startInCustom={startInCustom}
          saveLabel="Save"
          onSave={handleSave}
        />
      )}
    </SafeAreaView>
  );
}
