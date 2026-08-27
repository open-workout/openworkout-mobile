// Shared "silver" (neutral dark) base + a small accent palette.
// Base tokens match the hex values already in use across the app so this
// migration doesn't shift existing screens' look — it just centralizes them.
export const C = {
  bg: '#0a0a0a',
  card: '#18181b',
  border: '#27272a',
  borderAlt: '#3f3f46',
  text: '#f4f4f5',
  textMuted: '#71717a',
  textDim: '#52525b',
} as const;

// Accents — used sparingly on icons, badges, and highlights (never as large
// backgrounds) to keep the silver base while giving each section its own color.
export const accent = {
  green: '#10b981', // primary / success / Start
  greenBright: '#34d399',
  amber: '#f59e0b', // streak / energy
  blue: '#3b82f6', // Plan
  purple: '#a855f7', // Stats
  teal: '#14b8a6', // Exercises
  red: '#ef4444', // destructive
} as const;

export type ThemeColors = typeof C;
export type AccentColors = typeof accent;
