import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Exercise, NewExerciseInput } from '../db/exercises';
import { getMuscleLabel } from '../lib/exerciseTranslations';

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  altNameDraft: string;
  alt_names: string[];
  description: string;
  weight_direction: 1 | -1;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_FORM: FormState = {
  name: '',
  primary_muscles: [],
  secondary_muscles: [],
  altNameDraft: '',
  alt_names: [],
  description: '',
  weight_direction: 1,
};

const MUSCLE_SECTIONS: { id: string; muscles: string[]; isSuper: boolean }[] = [
  { id: 'superMuscles', muscles: ['legs', 'back', 'shoulders'], isSuper: true },
  { id: 'chestArms', muscles: ['chest', 'biceps', 'triceps', 'forearms'], isSuper: false },
  { id: 'core', muscles: ['core', 'abs'], isSuper: false },
  { id: 'legs', muscles: ['quads', 'glutes', 'hamstrings', 'adductors', 'calves'], isSuper: false },
  { id: 'back', muscles: ['traps', 'lats', 'rhomboids', 'lower back'], isSuper: false },
  { id: 'shoulders', muscles: ['front delts', 'side delts', 'rear delts'], isSuper: false },
];

// ─── Palette (matches app theme) ─────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: string }) {
  return (
    <Text style={{
      color: C.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 12,
      marginTop: 28,
    }}>
      {children}
    </Text>
  );
}

function MuscleChip({
  muscle, label, isSelected, isSuper, onPress,
}: {
  muscle: string;
  label: string;
  isSelected: boolean;
  isSuper: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: isSelected ? C.active : C.card,
        borderWidth: 1,
        borderColor: isSelected ? C.active : isSuper ? C.borderAlt : C.border,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      {isSuper && (
        <Ionicons
          name="layers-outline"
          size={11}
          color={isSelected ? C.activeDark : C.textMuted}
        />
      )}
      <Text style={{
        fontSize: 13,
        fontWeight: '600',
        color: isSelected ? C.activeDark : C.text,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MuscleSelector({
  sectionTitle,
  selected,
  onToggle,
  locale,
  t,
}: {
  sectionTitle: string;
  selected: string[];
  onToggle: (muscle: string) => void;
  locale: string;
  t: (key: string) => string;
}) {
  return (
    <View>
      <SectionHeader>{sectionTitle}</SectionHeader>
      {MUSCLE_SECTIONS.map((section) => (
        <View key={section.id} style={{ marginBottom: 8 }}>
          <Text style={{
            color: C.textDim,
            fontSize: 10,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 8,
          }}>
            {t(`muscleSections.${section.id}`)}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {section.muscles.map((muscle) => (
              <MuscleChip
                key={muscle}
                muscle={muscle}
                label={getMuscleLabel(muscle, locale)}
                isSelected={selected.includes(muscle)}
                isSuper={section.isSuper}
                onPress={() => onToggle(muscle)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function AltNameTag({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 20,
      paddingLeft: 12,
      paddingRight: 8,
      paddingVertical: 7,
      marginRight: 8,
      marginBottom: 8,
    }}>
      <Text style={{ color: C.text, fontSize: 13, fontWeight: '500' }}>{name}</Text>
      <TouchableOpacity onPress={onRemove}>
        <Ionicons name="close" size={14} color={C.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: NewExerciseInput) => Promise<void>;
  exercise?: Exercise;
};

export default function AddExerciseModal({ visible, onClose, onSubmit, exercise }: Props) {
  const { t: tExplore, i18n } = useTranslation('explore');
  const t = (key: string, options?: Record<string, unknown>) => tExplore(`addExerciseModal.${key}`, options);
  const locale = i18n.language;
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (exercise) {
      setForm({
        name: exercise.name,
        primary_muscles: exercise.primary_muscles ?? [],
        secondary_muscles: exercise.secondary_muscles ?? [],
        altNameDraft: '',
        alt_names: exercise.alt_names ?? [],
        description: exercise.description ?? '',
        weight_direction: exercise.weight_direction === -1 ? -1 : 1,
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setNameError('');
  }, [visible]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMuscle(list: 'primary_muscles' | 'secondary_muscles', muscle: string) {
    setForm((prev) => {
      const current = prev[list];
      const updated = current.includes(muscle)
        ? current.filter((m) => m !== muscle)
        : [...current, muscle];
      return { ...prev, [list]: updated };
    });
  }

  function addAltName() {
    const trimmed = form.altNameDraft.trim();
    if (!trimmed || form.alt_names.includes(trimmed)) return;
    setForm((prev) => ({
      ...prev,
      alt_names: [...prev.alt_names, trimmed],
      altNameDraft: '',
    }));
  }

  function removeAltName(name: string) {
    setForm((prev) => ({ ...prev, alt_names: prev.alt_names.filter((n) => n !== name) }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setNameError(t('nameRequired'));
      return;
    }
    setNameError('');
    setSubmitting(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        primary_muscles: form.primary_muscles,
        secondary_muscles: form.secondary_muscles,
        alt_names: form.alt_names,
        description: form.description.trim(),
        weight_direction: form.weight_direction,
      });
      setForm(INITIAL_FORM);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setForm(INITIAL_FORM);
    setNameError('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}>
            <TouchableOpacity onPress={handleClose}>
              <Text style={{ color: C.textMuted, fontSize: 16 }}>{tExplore('common:cancel')}</Text>
            </TouchableOpacity>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>{exercise ? t('editExercise') : t('newExercise')}</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={{
                backgroundColor: submitting ? C.card : C.active,
                paddingHorizontal: 16,
                paddingVertical: 7,
                borderRadius: 20,
              }}
            >
              <Text style={{
                color: submitting ? C.textMuted : C.activeDark,
                fontSize: 14,
                fontWeight: '700',
              }}>
                {submitting ? t('saving') : tExplore('common:save')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Name ── */}
            <SectionHeader>{t('nameSectionHeader')}</SectionHeader>
            <TextInput
              value={form.name}
              onChangeText={(v) => { set('name', v); setNameError(''); }}
              placeholder={t('namePlaceholder')}
              placeholderTextColor={C.textDim}
              style={{
                backgroundColor: C.card,
                borderWidth: 1,
                borderColor: nameError ? '#ef4444' : C.border,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                color: C.text,
                fontSize: 15,
              }}
              autoCapitalize="words"
            />
            {!!nameError && (
              <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{nameError}</Text>
            )}

            {/* ── Primary Muscles ── */}
            <MuscleSelector
              sectionTitle={t('primaryMusclesSectionHeader')}
              selected={form.primary_muscles}
              onToggle={(m) => toggleMuscle('primary_muscles', m)}
              locale={locale}
              t={t}
            />

            {/* ── Secondary Muscles ── */}
            <MuscleSelector
              sectionTitle={t('secondaryMusclesSectionHeader')}
              selected={form.secondary_muscles}
              onToggle={(m) => toggleMuscle('secondary_muscles', m)}
              locale={locale}
              t={t}
            />

            {/* ── Alt Names ── */}
            <SectionHeader>{t('altNamesSectionHeader')}</SectionHeader>
            {form.alt_names.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                {form.alt_names.map((name) => (
                  <AltNameTag key={name} name={name} onRemove={() => removeAltName(name)} />
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={form.altNameDraft}
                onChangeText={(v) => set('altNameDraft', v)}
                onSubmitEditing={addAltName}
                placeholder={t('altNamePlaceholder')}
                placeholderTextColor={C.textDim}
                returnKeyType="done"
                blurOnSubmit={false}
                style={{
                  flex: 1,
                  backgroundColor: C.card,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: C.text,
                  fontSize: 14,
                }}
              />
              <TouchableOpacity
                onPress={addAltName}
                style={{
                  backgroundColor: C.card,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="add" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {/* ── Description ── */}
            <SectionHeader>{t('descriptionSectionHeader')}</SectionHeader>
            <TextInput
              value={form.description}
              onChangeText={(v) => set('description', v)}
              placeholder={t('descriptionPlaceholder')}
              placeholderTextColor={C.textDim}
              multiline
              numberOfLines={4}
              style={{
                backgroundColor: C.card,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                color: C.text,
                fontSize: 14,
                minHeight: 96,
                textAlignVertical: 'top',
              }}
            />

            {/* ── Settings ── */}
            <SectionHeader>{t('settingsSectionHeader')}</SectionHeader>
            <View style={{
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: 16,
              overflow: 'hidden',
            }}>
              {/* Weight direction */}
              <View style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}>
                <Text style={{ color: C.text, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                  {t('weightDirectionLabel')}
                </Text>
                <Text style={{ color: C.textDim, fontSize: 12, marginBottom: 12 }}>
                  {t('weightDirectionHint')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {([
                    { value: 1 as const, label: t('weightDirectionNormal'), sub: t('weightDirectionNormalSub') },
                    { value: -1 as const, label: t('weightDirectionAssisted'), sub: t('weightDirectionAssistedSub') },
                  ] as const).map(({ value, label, sub }) => {
                    const active = form.weight_direction === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        onPress={() => set('weight_direction', value)}
                        style={{
                          flex: 1,
                          backgroundColor: active ? C.borderAlt : 'transparent',
                          borderWidth: 1,
                          borderColor: active ? C.borderAlt : C.border,
                          borderRadius: 10,
                          padding: 10,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: active ? C.text : C.textMuted, fontSize: 13, fontWeight: '700' }}>
                          {label}
                        </Text>
                        <Text style={{ color: C.textDim, fontSize: 10, marginTop: 2, textAlign: 'center' }}>
                          {sub}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* bottom breathing room */}
            <View style={{ height: 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
