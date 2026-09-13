import { translations, SUPPORTED_LANGUAGES } from '../index';

/**
 * The failure these pin down is silent: a misnamed or missing plural variant
 * renders the plural form for a count of one and nothing errors.
 */
describe('plural variants', () => {
  const pluralBases = ['guessesLeft', 'statusSolved', 'resultWinTitle'];

  it('every language defines the base form of each counted string', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const dict = translations[lang] as Record<string, string>;
      for (const base of pluralBases) {
        expect(`${lang}.${base}: ${dict[base] ?? 'MISSING'}`).toContain('{count}');
      }
    }
  });

  it('gives Russian its own few/many forms rather than an English split', () => {
    const ru = translations.ru as Record<string, string>;
    for (const base of pluralBases) {
      expect(ru[`${base}_one`]).toBeDefined();
      expect(ru[`${base}_few`]).toBeDefined();
      expect(ru[`${base}_many`]).toBeDefined();
    }
  });

  it('gives Arabic the two/few/many forms its grammar needs', () => {
    const ar = translations.ar as Record<string, string>;
    for (const base of pluralBases) {
      expect(ar[`${base}_two`]).toBeDefined();
      expect(ar[`${base}_few`]).toBeDefined();
      expect(ar[`${base}_many`]).toBeDefined();
    }
  });

  it('does not give a plural variant to languages with a single form', () => {
    for (const lang of ['zh', 'ja', 'ko'] as const) {
      const dict = translations[lang] as Record<string, string>;
      expect(Object.keys(dict).filter((k) => /_(one|two|few|many)$/.test(k))).toEqual([]);
    }
  });

  it('selects the singular form for a count of one', () => {
    // Mirrors t()'s resolution without pulling in expo-localization.
    const pick = (lang: string, key: string, count: number): string => {
      const dict = translations[lang as 'en'] as Record<string, string>;
      const category = new Intl.PluralRules(lang).select(count);
      return dict[`${key}_${category}`] ?? dict[key];
    };
    expect(pick('en', 'guessesLeft', 1)).toBe('Last guess');
    expect(pick('en', 'guessesLeft', 3)).toContain('{count}');
    expect(pick('ru', 'guessesLeft', 2)).toBe(
      (translations.ru as Record<string, string>).guessesLeft_few,
    );
  });
});
