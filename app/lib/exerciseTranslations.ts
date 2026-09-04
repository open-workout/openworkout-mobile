import type { Exercise } from '../db/exercises';
import type { SupportedLanguage } from '../i18n/resources';
import { MUSCLE_LABELS } from '../i18n/muscles/labels';
import { CATEGORY_LABELS } from '../i18n/muscles/categoryLabels';
import { EQUIPMENT_LABELS } from '../i18n/equipment/labels';
import fr from '../i18n/exercises/fr.json';
import de from '../i18n/exercises/de.json';
import ro from '../i18n/exercises/ro.json';
import es from '../i18n/exercises/es.json';

type ExerciseTranslationEntry = {
  name: string;
  altNames?: string[];
  description?: string;
};

type ExerciseTranslationMap = Record<string, ExerciseTranslationEntry>;

const EXERCISE_TRANSLATIONS: Partial<Record<SupportedLanguage, ExerciseTranslationMap>> = {
  fr: fr as ExerciseTranslationMap,
  de: de as ExerciseTranslationMap,
  ro: ro as ExerciseTranslationMap,
  es: es as ExerciseTranslationMap,
};

function getTranslationEntry(exerciseName: string, locale: string): ExerciseTranslationEntry | undefined {
  const map = EXERCISE_TRANSLATIONS[locale as SupportedLanguage];
  return map?.[exerciseName];
}

export function getExerciseDisplayName(exercise: Pick<Exercise, 'name'>, locale: string): string {
  return getTranslationEntry(exercise.name, locale)?.name ?? exercise.name;
}

export function getExerciseDisplayAltNames(exercise: Pick<Exercise, 'name' | 'alt_names'>, locale: string): string[] {
  return getTranslationEntry(exercise.name, locale)?.altNames ?? exercise.alt_names ?? [];
}

export function getExerciseSearchTerms(exercise: Pick<Exercise, 'name' | 'alt_names'>, locale: string): string[] {
  const terms = [exercise.name, ...(exercise.alt_names ?? [])];
  if (locale !== 'en') {
    const entry = getTranslationEntry(exercise.name, locale);
    if (entry) {
      terms.push(entry.name, ...(entry.altNames ?? []));
    }
  }
  return terms;
}

export function exerciseMatchesQuery(
  exercise: Pick<Exercise, 'name' | 'alt_names'>,
  query: string,
  locale: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return getExerciseSearchTerms(exercise, locale).some((term) => term.toLowerCase().includes(q));
}

export function getMuscleLabel(slug: string, locale: string): string {
  return MUSCLE_LABELS[locale as SupportedLanguage]?.[slug] ?? MUSCLE_LABELS.en[slug] ?? slug;
}

export function getMuscleLabels(slugs: string[], locale: string): string[] {
  return slugs.map((slug) => getMuscleLabel(slug, locale));
}

export function getEquipmentLabel(slug: string, locale: string): string {
  return EQUIPMENT_LABELS[locale as SupportedLanguage]?.[slug] ?? EQUIPMENT_LABELS.en[slug] ?? slug;
}

export function getEquipmentLabels(slugs: string[], locale: string): string[] {
  return slugs.map((slug) => getEquipmentLabel(slug, locale));
}

export function getCategoryLabel(categoryKey: string, locale: string): string {
  return CATEGORY_LABELS[locale as SupportedLanguage]?.[categoryKey] ?? CATEGORY_LABELS.en[categoryKey] ?? categoryKey;
}
