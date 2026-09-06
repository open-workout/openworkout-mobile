// Maps the app's simplified muscle vocabulary (lib/muscleMapping.ts) onto
// react-native-body-highlighter's own slug vocabulary. Mostly a 1:1 rename;
// 'back' is the only one-to-many case since the library splits what this app
// treats as a single muscle group across trapezius/upper-back/lower-back.
import type { Slug } from 'react-native-body-highlighter';
import type { SimplifiedMuscle } from './muscleMapping';

export const SIMPLIFIED_TO_SLUGS: Record<SimplifiedMuscle, Slug[]> = {
  chest: ['chest'],
  back: ['trapezius', 'upper-back', 'lower-back'],
  shoulders: ['deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['forearm'],
  abs: ['abs'],
  quads: ['quadriceps'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  calves: ['calves'],
  adductors: ['adductors'],
  neck: ['neck'],
};

export const SLUG_TO_SIMPLIFIED: Partial<Record<Slug, SimplifiedMuscle>> = Object.fromEntries(
  Object.entries(SIMPLIFIED_TO_SLUGS).flatMap(([muscle, slugs]) =>
    slugs.map((slug) => [slug, muscle as SimplifiedMuscle]),
  ),
);
