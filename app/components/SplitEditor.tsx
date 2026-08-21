import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  PRESET_SPLITS,
  DAY_TEMPLATES,
  MUSCLE_SECTIONS_SPLIT,
  SUPER_MUSCLE_MAP,
  getSuperState,
  compressMuscles,
  type Split,
  type SplitDay,
  type SuperState,
} from '../constants/splits';
import { getMuscleLabel, getMuscleLabels } from '../lib/exerciseTranslations';
import { getPresetName, getPresetDescription, getDayNameLabel } from '../lib/splitTranslations';

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  bg: '#0a0a0a',
  card: '#18181b',
  cardAlt: '#1c1c1f',
  border: '#27272a',
  borderAlt: '#3f3f46',
  text: '#f4f4f5',
  textMuted: '#71717a',
  textDim: '#52525b',
  active: '#f4f4f5',
  activeDark: '#09090b',
};

// ─── Internal sub-components ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{
      color: C.textDim,
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
    }}>
      {children}
    </Text>
  );
}

function MuscleChip({
  muscle, label, isSelected, isSuper, superState, onPress,
}: {
  muscle: string;
  label: string;
  isSelected: boolean;
  isSuper: boolean;
  superState?: SuperState;
  onPress: () => void;
}) {
  const isSome = isSuper && superState === 'some';
  const isAll = isSuper && superState === 'all';
  const effectiveSelected = isSuper ? isAll : isSelected;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: effectiveSelected ? C.active : isSome ? C.cardAlt : C.card,
        borderWidth: 1,
        borderColor: effectiveSelected ? C.active : isSome ? C.borderAlt : isSuper ? C.borderAlt : C.border,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      {isSuper && (
        <Ionicons name="layers-outline" size={11} color={effectiveSelected ? C.activeDark : C.textMuted} />
      )}
      <Text style={{
        fontSize: 13,
        fontWeight: '600',
        color: effectiveSelected ? C.activeDark : C.text,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MuscleGrid({ selected, onToggle }: { selected: string[]; onToggle: (m: string) => void }) {
  const { t: tExplore, i18n } = useTranslation('explore');
  const locale = i18n.language;

  function handleSuperToggle(superKey: string) {
    const children = SUPER_MUSCLE_MAP[superKey];
    const state = getSuperState(superKey, selected);
    if (state === 'all') {
      children.forEach(c => { if (selected.includes(c)) onToggle(c); });
    } else {
      children.forEach(c => { if (!selected.includes(c)) onToggle(c); });
    }
  }

  return (
    <View>
      {MUSCLE_SECTIONS_SPLIT.map((section) => (
        <View key={section.id} style={{ marginBottom: 12 }}>
          <SectionLabel>{tExplore(`addExerciseModal.muscleSections.${section.id}`)}</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {section.muscles.map((muscle) => {
              if (section.isSuper) {
                const state = getSuperState(muscle, selected);
                return (
                  <MuscleChip
                    key={muscle}
                    muscle={muscle}
                    label={getMuscleLabel(muscle, locale)}
                    isSelected={false}
                    isSuper
                    superState={state}
                    onPress={() => handleSuperToggle(muscle)}
                  />
                );
              }
              return (
                <MuscleChip
                  key={muscle}
                  muscle={muscle}
                  label={getMuscleLabel(muscle, locale)}
                  isSelected={selected.includes(muscle)}
                  isSuper={false}
                  onPress={() => onToggle(muscle)}
                />
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Preset Picker ────────────────────────────────────────────────────────────

function PresetPickerView({
  selectedId, onSelect, onCustom, onConfirm, saveLabel,
}: {
  selectedId: string | null;
  onSelect: (split: Split) => void;
  onCustom: () => void;
  onConfirm: () => void;
  saveLabel: string;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('routines');
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ color: C.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, paddingTop: 24, marginBottom: 20 }}>
          {t('whatsYourSplit')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
          {PRESET_SPLITS.map((split) => {
            const isSelected = selectedId === split.id;
            return (
              <View key={split.id} style={{ width: '50%', paddingHorizontal: 5, marginBottom: 10 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onSelect(split)}
                  style={{
                    flex: 1,
                    backgroundColor: C.card,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: isSelected ? C.active : C.border,
                    overflow: 'hidden',
                  }}
                >
                  <View style={{ padding: 14 }}>
                    <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 4 }}>
                      {getPresetName(split.id, t)}
                    </Text>
                    <Text style={{ color: C.textMuted, fontSize: 12, lineHeight: 17 }}>
                      {getPresetDescription(split.id, t)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={{ width: '50%', paddingHorizontal: 5, marginBottom: 10 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onCustom}
              style={{
                flex: 1,
                backgroundColor: C.card,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: C.border,
                borderStyle: 'dashed',
                padding: 14,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                minHeight: 90,
              }}
            >
              <Ionicons name="construct-outline" size={22} color={C.textMuted} />
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{t('custom')}</Text>
              <Text style={{ color: C.textMuted, fontSize: 12, textAlign: 'center' }}>{t('buildYourOwn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 16, paddingTop: 16,
        backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border,
      }}>
        <TouchableOpacity
          onPress={onConfirm}
          disabled={!selectedId}
          activeOpacity={0.8}
          style={{
            backgroundColor: selectedId ? C.active : C.card,
            borderRadius: 14, paddingVertical: 16, alignItems: 'center',
          }}
        >
          <Text style={{ color: selectedId ? C.activeDark : C.textDim, fontSize: 16, fontWeight: '700' }}>
            {saveLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Custom Builder ───────────────────────────────────────────────────────────

type AddDayMode = 'templates' | 'manual';

function CustomBuilderView({
  days, onBack, onAddDay, onRemoveDay, onRenameDay, onConfirm, saveLabel,
}: {
  days: SplitDay[];
  onBack: () => void;
  onAddDay: (day: SplitDay) => void;
  onRemoveDay: (index: number) => void;
  onRenameDay: (index: number, name: string) => void;
  onConfirm: () => void;
  saveLabel: string;
}) {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation('routines');
  const locale = i18n.language;
  const [panelOpen, setPanelOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddDayMode>('templates');
  const [pendingName, setPendingName] = useState('');
  const [pendingMuscles, setPendingMuscles] = useState<string[]>([]);

  function togglePendingMuscle(muscle: string) {
    setPendingMuscles(prev => prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]);
  }

  function applyTemplate(template: { name: string; muscles: string[] }) {
    onAddDay({ name: template.name, muscles: template.muscles });
    resetPanel();
  }

  function confirmManualDay() {
    if (pendingMuscles.length === 0) return;
    onAddDay({ name: pendingName.trim() || t('dayPlaceholder', { n: days.length + 1 }), muscles: pendingMuscles });
    resetPanel();
  }

  function resetPanel() {
    setPanelOpen(false);
    setAddMode('templates');
    setPendingName('');
    setPendingMuscles([]);
  }

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={onBack}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 20, marginBottom: 20 }}
          >
            <Ionicons name="chevron-back" size={18} color={C.textMuted} />
            <Text style={{ color: C.textMuted, fontSize: 15 }}>{t('presets')}</Text>
          </TouchableOpacity>

          <Text style={{ color: C.text, fontSize: 28, fontWeight: '800', marginBottom: 8 }}>{t('customSplit')}</Text>
          <Text style={{ color: C.textMuted, fontSize: 15, marginBottom: 16 }}>
            {t('addDaysHint')}
          </Text>

          {panelOpen ? (
            <View style={{
              backgroundColor: C.card, borderRadius: 16,
              borderWidth: 1, borderColor: C.borderAlt, padding: 16,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{t('addDay')}</Text>
                <TouchableOpacity onPress={resetPanel}>
                  <Ionicons name="close" size={20} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {(['templates', 'manual'] as AddDayMode[]).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setAddMode(mode)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                      backgroundColor: addMode === mode ? C.active : C.cardAlt,
                      borderWidth: 1, borderColor: addMode === mode ? C.active : C.border,
                    }}
                  >
                    <Text style={{
                      color: addMode === mode ? C.activeDark : C.textMuted,
                      fontSize: 13, fontWeight: '600',
                    }}>
                      {mode === 'templates' ? t('quickAdd') : t('manual')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {addMode === 'templates' ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {DAY_TEMPLATES.map((tpl) => (
                    <TouchableOpacity
                      key={tpl.name}
                      onPress={() => applyTemplate(tpl)}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                        backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border,
                      }}
                    >
                      <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{getDayNameLabel(tpl.name, t)}</Text>
                      <Text style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>{t('musclesCount', { count: tpl.muscles.length })}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View>
                  <TextInput
                    value={pendingName}
                    onChangeText={setPendingName}
                    placeholder={t('dayPlaceholder', { n: days.length + 1 })}
                    placeholderTextColor={C.textDim}
                    style={{
                      backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border,
                      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                      color: C.text, fontSize: 14, marginBottom: 16,
                    }}
                  />
                  <TouchableOpacity
                    onPress={confirmManualDay}
                    disabled={pendingMuscles.length === 0}
                    activeOpacity={0.8}
                    style={{
                      marginBottom: 16,
                      backgroundColor: pendingMuscles.length > 0 ? C.active : C.cardAlt,
                      borderRadius: 12, paddingVertical: 12, alignItems: 'center',
                    }}
                  >
                    <Text style={{
                      color: pendingMuscles.length > 0 ? C.activeDark : C.textDim,
                      fontSize: 14, fontWeight: '700',
                    }}>
                      {t('addDay')}
                    </Text>
                  </TouchableOpacity>
                  <MuscleGrid selected={pendingMuscles} onToggle={togglePendingMuscle} />
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setPanelOpen(true)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: C.card, borderRadius: 14, borderWidth: 1,
                borderColor: C.border, borderStyle: 'dashed', paddingVertical: 14, paddingHorizontal: 16,
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 14, fontWeight: '600' }}>{t('addDay')}</Text>
            </TouchableOpacity>
          )}

          {days.length > 0 && (
            <View style={{ gap: 10, marginTop: 16 }}>
              {days.map((day, idx) => (
                <View key={idx} style={{
                  backgroundColor: C.card, borderRadius: 14,
                  borderWidth: 1, borderColor: C.border, padding: 14,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TextInput
                      value={day.name}
                      onChangeText={(v) => onRenameDay(idx, v)}
                      style={{ flex: 1, color: C.text, fontSize: 15, fontWeight: '600', padding: 0 }}
                      placeholderTextColor={C.textDim}
                    />
                    <TouchableOpacity onPress={() => onRemoveDay(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={20} color={C.textDim} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
                    {getMuscleLabels(compressMuscles(day.muscles), locale).map((label, mi) => (
                      <View key={mi} style={{
                        backgroundColor: C.cardAlt, borderRadius: 20,
                        paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6,
                      }}>
                        <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '500' }}>
                          {label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 16, paddingTop: 16,
        backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border,
      }}>
        <TouchableOpacity
          onPress={onConfirm}
          disabled={days.length === 0}
          activeOpacity={0.8}
          style={{
            backgroundColor: days.length > 0 ? C.active : C.card,
            borderRadius: 14, paddingVertical: 16, alignItems: 'center',
          }}
        >
          <Text style={{ color: days.length > 0 ? C.activeDark : C.textDim, fontSize: 16, fontWeight: '700' }}>
            {saveLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────

export type SplitEditorProps = {
  initialPreset?: Split | null;
  initialDays?: SplitDay[];
  startInCustom?: boolean;
  saveLabel?: string;
  onSave: (name: string, days: SplitDay[]) => Promise<void>;
};

export default function SplitEditor({
  initialPreset = null,
  initialDays = [],
  startInCustom = false,
  saveLabel,
  onSave,
}: SplitEditorProps) {
  const { t } = useTranslation('common');
  const resolvedSaveLabel = saveLabel ?? t('save');
  const [view, setView] = useState<'presets' | 'custom'>(startInCustom ? 'custom' : 'presets');
  const [selectedPreset, setSelectedPreset] = useState<Split | null>(initialPreset);
  const [customDays, setCustomDays] = useState<SplitDay[]>(initialDays);
  const [saving, setSaving] = useState(false);

  async function handlePresetConfirm() {
    if (!selectedPreset || saving) return;
    setSaving(true);
    try {
      await onSave(selectedPreset.name, selectedPreset.days);
    } finally {
      setSaving(false);
    }
  }

  async function handleCustomConfirm() {
    if (customDays.length === 0 || saving) return;
    setSaving(true);
    try {
      await onSave('Custom', customDays);
    } finally {
      setSaving(false);
    }
  }

  if (view === 'presets') {
    return (
      <PresetPickerView
        selectedId={selectedPreset?.id ?? null}
        onSelect={setSelectedPreset}
        onCustom={() => { setCustomDays([]); setView('custom'); }}
        onConfirm={handlePresetConfirm}
        saveLabel={saving ? t('routines:saving') : resolvedSaveLabel}
      />
    );
  }

  return (
    <CustomBuilderView
      days={customDays}
      onBack={() => setView('presets')}
      onAddDay={(day) => setCustomDays(prev => [...prev, day])}
      onRemoveDay={(idx) => setCustomDays(prev => prev.filter((_, i) => i !== idx))}
      onRenameDay={(idx, name) => setCustomDays(prev => prev.map((d, i) => i === idx ? { ...d, name } : d))}
      onConfirm={handleCustomConfirm}
      saveLabel={saving ? t('routines:saving') : resolvedSaveLabel}
    />
  );
}
