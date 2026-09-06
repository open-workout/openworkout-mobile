import type { SupportedLanguage } from '../resources';

export const CATEGORY_LABELS: Record<SupportedLanguage, Record<string, string>> = {
  en: { All: 'All', Chest: 'Chest', Back: 'Back', Legs: 'Legs', Arms: 'Arms', Shoulders: 'Shoulders' },
  fr: { All: 'Tout', Chest: 'Pectoraux', Back: 'Dos', Legs: 'Jambes', Arms: 'Bras', Shoulders: 'Épaules' },
  de: { All: 'Alle', Chest: 'Brust', Back: 'Rücken', Legs: 'Beine', Arms: 'Arme', Shoulders: 'Schultern' },
  ro: { All: 'Toate', Chest: 'Piept', Back: 'Spate', Legs: 'Picioare', Arms: 'Brațe', Shoulders: 'Umeri' },
  es: { All: 'Todos', Chest: 'Pecho', Back: 'Espalda', Legs: 'Piernas', Arms: 'Brazos', Shoulders: 'Hombros' },
};
