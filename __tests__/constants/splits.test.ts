import {
  expandMuscles,
  getSuperState,
  compressMuscles,
  SUPER_MUSCLE_MAP,
  PRESET_SPLITS,
} from '../../app/constants/splits';

describe('expandMuscles', () => {
  it('expands a super-muscle key to its children', () => {
    expect(expandMuscles(['legs'])).toEqual(
      expect.arrayContaining(['quads', 'hamstrings', 'glutes', 'adductors', 'calves']),
    );
    expect(expandMuscles(['legs'])).toHaveLength(SUPER_MUSCLE_MAP.legs.length);
  });

  it('passes through leaf muscles unchanged', () => {
    expect(expandMuscles(['chest'])).toEqual(['chest']);
  });

  it('expands a mix of super and leaf muscles without duplicates', () => {
    const result = expandMuscles(['legs', 'chest', 'quads']);
    expect(result).toContain('chest');
    expect(result).toContain('quads');
    expect(result.filter(m => m === 'quads')).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(expandMuscles([])).toEqual([]);
  });
});

describe('getSuperState', () => {
  const legsChildren = SUPER_MUSCLE_MAP.legs;

  it('returns none when no children are selected', () => {
    expect(getSuperState('legs', [])).toBe('none');
    expect(getSuperState('legs', ['chest'])).toBe('none');
  });

  it('returns some when a subset of children are selected', () => {
    expect(getSuperState('legs', ['quads'])).toBe('some');
    expect(getSuperState('legs', ['quads', 'calves'])).toBe('some');
  });

  it('returns all when all children are selected', () => {
    expect(getSuperState('legs', legsChildren)).toBe('all');
  });

  it('returns none for an unknown super key', () => {
    expect(getSuperState('nonexistent', ['quads'])).toBe('none');
  });

  it('works for back and shoulders', () => {
    expect(getSuperState('back', SUPER_MUSCLE_MAP.back)).toBe('all');
    expect(getSuperState('shoulders', ['front delts'])).toBe('some');
  });
});

describe('compressMuscles', () => {
  it('replaces a complete super-muscle group with its key', () => {
    const result = compressMuscles(['quads', 'hamstrings', 'glutes', 'adductors', 'calves']);
    expect(result).toEqual(['legs']);
  });

  it('leaves partial groups uncompressed', () => {
    const result = compressMuscles(['quads', 'hamstrings']);
    expect(result).toContain('quads');
    expect(result).toContain('hamstrings');
    expect(result).not.toContain('legs');
  });

  it('compresses multiple complete groups and preserves remaining muscles', () => {
    const input = [
      'quads', 'hamstrings', 'glutes', 'adductors', 'calves', // legs
      'traps', 'lats', 'rhomboids', 'lower back',             // back
      'chest', 'biceps',
    ];
    const result = compressMuscles(input);
    expect(result).toContain('legs');
    expect(result).toContain('back');
    expect(result).toContain('chest');
    expect(result).toContain('biceps');
    expect(result).not.toContain('quads');
    expect(result).not.toContain('traps');
  });

  it('returns leaf muscles unchanged when no group is complete', () => {
    expect(compressMuscles(['chest', 'biceps'])).toEqual(['chest', 'biceps']);
  });

  it('returns empty array for empty input', () => {
    expect(compressMuscles([])).toEqual([]);
  });
});

describe('PRESET_SPLITS data integrity', () => {
  it('each preset has at least one day', () => {
    for (const split of PRESET_SPLITS) {
      expect(split.days.length).toBeGreaterThan(0);
    }
  });

  it('no day has an empty muscles array', () => {
    for (const split of PRESET_SPLITS) {
      for (const day of split.days) {
        expect(day.muscles.length).toBeGreaterThan(0);
      }
    }
  });

  it('all preset ids are unique', () => {
    const ids = PRESET_SPLITS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
