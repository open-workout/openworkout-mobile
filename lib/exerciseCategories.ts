import type { Exercise } from '../db/exercises';

export const EXERCISE_CATEGORIES = ['All', 'Chest', 'Back', 'Legs', 'Arms', 'Shoulders'];

const CATEGORY_MUSCLE_KEYWORDS: Record<string, string[]> = {
  Chest: ['chest'],
  Back: ['back', 'lats', 'traps', 'rhomboids'],
  Legs: ['legs', 'quads', 'glutes', 'hamstrings', 'calves'],
  Arms: ['bicep', 'tricep', 'forearm'],
  Shoulders: ['delt', 'shoulder'],
};

export function exerciseMatchesCategory(ex: Exercise, category: string): boolean {
  if (category === 'All') return true;
  const keywords = CATEGORY_MUSCLE_KEYWORDS[category] ?? [];
  const muscles = [...ex.primary_muscles, ...ex.secondary_muscles].map((m) => m.toLowerCase());
  return keywords.some((kw) => muscles.some((m) => m.includes(kw)));
}
