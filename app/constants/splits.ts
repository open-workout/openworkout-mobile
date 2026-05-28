export type SplitDay = { name: string; muscles: string[] };
export type Split = { id: string; name: string; days: SplitDay[]; created_at: number };

export const SUPER_MUSCLE_MAP: Record<string, string[]> = {
  legs: ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'],
  back: ['traps', 'lats', 'rhomboids', 'lower back'],
  shoulders: ['front delts', 'side delts', 'rear delts'],
};

export type SuperState = 'none' | 'some' | 'all';

export function expandMuscles(selected: string[]): string[] {
  const result = new Set<string>();
  for (const m of selected) {
    const children = SUPER_MUSCLE_MAP[m];
    if (children) children.forEach(c => result.add(c));
    else result.add(m);
  }
  return Array.from(result);
}

export function compressMuscles(muscles: string[]): string[] {
  const muscleSet = new Set(muscles);
  const consumed = new Set<string>();
  const superGroups: string[] = [];

  for (const [superKey, children] of Object.entries(SUPER_MUSCLE_MAP)) {
    if (children.every(c => muscleSet.has(c))) {
      superGroups.push(superKey);
      children.forEach(c => consumed.add(c));
    }
  }

  const remaining = muscles.filter(m => !consumed.has(m));
  return [...superGroups, ...remaining];
}

export function getSuperState(superKey: string, selected: string[]): SuperState {
  const children = SUPER_MUSCLE_MAP[superKey];
  if (!children) return 'none';
  const count = children.filter(c => selected.includes(c)).length;
  if (count === 0) return 'none';
  if (count === children.length) return 'all';
  return 'some';
}

export const PRESET_SPLITS: Split[] = [
  {
    id: 'preset_upper_lower',
    name: 'Upper / Lower',
    created_at: 0,
    days: [
      {
        name: 'Upper',
        muscles: [
          'chest', 'biceps', 'triceps', 'forearms',
          'traps', 'lats', 'rhomboids', 'lower back',
          'front delts', 'side delts', 'rear delts',
        ],
      },
      {
        name: 'Lower',
        muscles: ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'],
      },
    ],
  },
  {
    id: 'preset_full_body',
    name: 'Full Body',
    created_at: 0,
    days: [
      {
        name: 'Full Body',
        muscles: [
          'chest', 'biceps', 'triceps', 'forearms',
          'quads', 'hamstrings', 'glutes', 'adductors', 'calves',
          'traps', 'lats', 'rhomboids', 'lower back',
          'front delts', 'side delts', 'rear delts',
          'core', 'abs',
        ],
      },
    ],
  },
  {
    id: 'preset_ppl',
    name: 'PPL',
    created_at: 0,
    days: [
      {
        name: 'Push',
        muscles: ['chest', 'triceps', 'front delts', 'side delts'],
      },
      {
        name: 'Pull',
        muscles: ['lats', 'rhomboids', 'traps', 'lower back', 'biceps', 'forearms', 'rear delts'],
      },
      {
        name: 'Legs',
        muscles: ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'],
      },
    ],
  },
  {
    id: 'preset_bro_split',
    name: 'Bro Split',
    created_at: 0,
    days: [
      { name: 'Chest', muscles: ['chest'] },
      { name: 'Back', muscles: ['traps', 'lats', 'rhomboids', 'lower back'] },
      { name: 'Shoulders', muscles: ['front delts', 'side delts', 'rear delts'] },
      { name: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
      { name: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'] },
    ],
  },
  {
    id: 'preset_arnold',
    name: 'Arnold Split',
    created_at: 0,
    days: [
      {
        name: 'Chest & Back',
        muscles: ['chest', 'traps', 'lats', 'rhomboids', 'lower back'],
      },
      {
        name: 'Shoulders & Arms',
        muscles: ['front delts', 'side delts', 'rear delts', 'biceps', 'triceps', 'forearms'],
      },
      {
        name: 'Legs',
        muscles: ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'],
      },
    ],
  },
];

export const PRESET_DESCRIPTIONS: Record<string, string> = {
  preset_upper_lower: '2-day rotation, great for beginners',
  preset_full_body: 'Train everything each session',
  preset_ppl: 'Push / Pull / Legs — 3 or 6 days',
  preset_bro_split: 'One muscle group per day',
  preset_arnold: 'Arnold\'s classic 3-day rotation',
};

export type DayTemplate = { name: string; muscles: string[] };

export const DAY_TEMPLATES: DayTemplate[] = [
  {
    name: 'Upper',
    muscles: [
      'chest', 'biceps', 'triceps', 'forearms',
      'traps', 'lats', 'rhomboids', 'lower back',
      'front delts', 'side delts', 'rear delts',
    ],
  },
  {
    name: 'Lower',
    muscles: ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'],
  },
  {
    name: 'Push',
    muscles: ['chest', 'triceps', 'front delts', 'side delts'],
  },
  {
    name: 'Pull',
    muscles: ['lats', 'rhomboids', 'traps', 'lower back', 'biceps', 'forearms', 'rear delts'],
  },
  {
    name: 'Legs',
    muscles: ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'],
  },
  {
    name: 'Core',
    muscles: ['core', 'abs'],
  },
  {
    name: 'Full',
    muscles: [
      'chest', 'biceps', 'triceps', 'forearms',
      'quads', 'hamstrings', 'glutes', 'adductors', 'calves',
      'traps', 'lats', 'rhomboids', 'lower back',
      'front delts', 'side delts', 'rear delts',
      'core', 'abs',
    ],
  },
];

export const MUSCLE_SECTIONS_SPLIT: { label: string; muscles: string[]; isSuper: boolean }[] = [
  { label: 'Super Muscles', muscles: ['legs', 'back', 'shoulders'], isSuper: true },
  { label: 'Chest & Arms', muscles: ['chest', 'biceps', 'triceps', 'forearms'], isSuper: false },
  { label: 'Core', muscles: ['core', 'abs'], isSuper: false },
  { label: 'Legs', muscles: ['quads', 'glutes', 'hamstrings', 'adductors', 'calves'], isSuper: false },
  { label: 'Back', muscles: ['traps', 'lats', 'rhomboids', 'lower back'], isSuper: false },
  { label: 'Shoulders', muscles: ['front delts', 'side delts', 'rear delts'], isSuper: false },
];
