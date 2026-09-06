import en from './locales/en';
import fr from './locales/fr';
import de from './locales/de';
import ro from './locales/ro';
import es from './locales/es';

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'ro', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  ro: 'Română',
  es: 'Español',
};

export const resources = { en, fr, de, ro, es };

export const defaultNS = 'common';
