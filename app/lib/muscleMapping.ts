// Simplified muscle vocabulary shared by the Body stats screen. Matches the
// vocabulary already used by the CSV-derived exercise catalog (the bulk of
// the exercise library) so every exercise's tags resolve without guessing.
// The smaller curated SEED_EXERCISES dataset uses finer-grained tags (e.g.
// individual delt heads, individual back muscles) that get folded down onto
// this list via MUSCLE_MAP below.
export const SIMPLIFIED_MUSCLES = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'adductors',
  'neck',
] as const;

export type SimplifiedMuscle = (typeof SIMPLIFIED_MUSCLES)[number];

const SIMPLIFIED_MUSCLE_SET: Set<string> = new Set(SIMPLIFIED_MUSCLES);

// Tags that map onto a simplified muscle 1:1 or many:1. Anything not listed
// here and not already a simplified muscle itself resolves to null (see
// normalizeMuscle) — e.g. activity-type tags like "cardio" or "yoga", or
// tags too coarse to attribute to a single muscle like "legs".
const MUSCLE_MAP: Record<string, SimplifiedMuscle | null> = {
  'front delts': 'shoulders',
  'side delts': 'shoulders',
  'rear delts': 'shoulders',
  lats: 'back',
  traps: 'back',
  rhomboids: 'back',
  'lower back': 'back',
  core: 'abs',
  legs: null,
  cardio: null,
  plyometrics: null,
  stretching: null,
  weightlifting: null,
  yoga: null,
  feet: null,
  hands: null,
};

export function normalizeMuscle(tag: string): SimplifiedMuscle | null {
  const key = tag.trim().toLowerCase();
  if (SIMPLIFIED_MUSCLE_SET.has(key)) return key as SimplifiedMuscle;
  if (key in MUSCLE_MAP) return MUSCLE_MAP[key];
  return null;
}

export function normalizeMuscles(tags: string[]): SimplifiedMuscle[] {
  const result: SimplifiedMuscle[] = [];
  const seen = new Set<SimplifiedMuscle>();
  for (const tag of tags) {
    const normalized = normalizeMuscle(tag);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}
