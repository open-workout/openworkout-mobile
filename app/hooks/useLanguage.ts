import { useState, useEffect, useCallback } from 'react';
import i18n from '../i18n';
import { getLanguage, setLanguage } from '../storage';

export function useLanguage() {
  const [language, setLanguageState] = useState(i18n.language);

  const reload = useCallback(async () => {
    const stored = await getLanguage();
    if (stored && stored !== i18n.language) {
      await i18n.changeLanguage(stored);
    }
    setLanguageState(i18n.language);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const update = useCallback(async (lang: string) => {
    await i18n.changeLanguage(lang);
    setLanguageState(lang);
    await setLanguage(lang);
  }, []);

  return { language, update, reload };
}
