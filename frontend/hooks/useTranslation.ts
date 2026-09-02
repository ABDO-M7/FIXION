import { useUIStore } from '@/store';
import { en } from '@/locales/en';
import { ar } from '@/locales/ar';

const dictionaries = { en, ar };

export function useTranslation() {
  const { locale } = useUIStore();
  const dict = dictionaries[locale] || en;

  // Simple nested key resolver, e.g. t('nav.dashboard')
  const t = (key: string): string => {
    const keys = key.split('.');
    let result: any = dict;
    for (const k of keys) {
      if (result[k] === undefined) {
        // Fallback to English if key missing in Arabic
        let fallback: any = en;
        for (const fk of keys) {
          if (fallback[fk] === undefined) return key;
          fallback = fallback[fk];
        }
        return fallback as string;
      }
      result = result[k];
    }
    return result as string;
  };

  return { t, locale, isRtl: locale === 'ar' };
}
