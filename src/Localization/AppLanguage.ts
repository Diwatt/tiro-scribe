/**
 * Global app language: single source of truth for locale (device/OS only).
 * Singleton; constructor sets locale from device on first getInstance(). No React providers; screens call useAppLanguage().
 */

import * as Localization from 'expo-localization';
import type { Locales, TranslationFunctions, Translations } from './i18n-types';
import { en } from './translations/en';
import { fr } from './translations/fr';

const INITIAL_DICTIONARIES: Record<Locales, Translations> = {
    en: en as Translations,
    fr: fr as Translations,
};

export interface UseAppLanguageReturn {
    locale: Locales;
    /** Translation functions; at call site use as LL (e.g. LL.onboarding.aboutYou()). */
    LL: TranslationFunctions;
}

export class AppLanguage {
    public static readonly SUPPORTED_LOCALES: Locales[] = ['en', 'fr'];

    public static readonly DEFAULT_LOCALE: Locales = 'en';

    private static instance: AppLanguage | null = null;

    private static readonly translationCache: Partial<Record<Locales, TranslationFunctions>> = AppLanguage.createEmptyTranslationCache();

    private static readonly dictionaries: Record<Locales, Translations> = INITIAL_DICTIONARIES;

    private locale: Locales = AppLanguage.DEFAULT_LOCALE;

    private constructor() {
        this.locale = this.getDeviceLocale();
    }

    public static getInstance(): AppLanguage {
        if (AppLanguage.instance === null) {
            AppLanguage.instance = new AppLanguage();
        }
        return AppLanguage.instance;
    }

    public getLocale(): Locales {
        return this.locale;
    }

    public getTranslationFunctions(locale: Locales): TranslationFunctions {
        const effectiveLocale = AppLanguage.isLocale(locale) ? locale : AppLanguage.DEFAULT_LOCALE;
        const cached = AppLanguage.translationCache[effectiveLocale];
        if (cached) {
            return cached;
        }
        const translations = AppLanguage.dictionaries[effectiveLocale] ?? AppLanguage.dictionaries.en;
        const built = AppLanguage.buildTranslationFunctions(translations);
        AppLanguage.translationCache[effectiveLocale] = built;
        return built;
    }

    public getDeviceLocale(): Locales {
        try {
            const locales = Localization.getLocales();
            // Prefer the first resolved locale from the OS
            if (locales && locales.length > 0) {
                const first = locales[0];
                const languageCode = first.languageCode ?? first.languageTag?.split('-')[0] ?? 'en';
                if (AppLanguage.isLocale(languageCode)) {
                    return languageCode;
                }
            }
            // Fallback to the global locale string if needed
            const fallbackTag = (Localization as { locale?: string }).locale;
            if (fallbackTag) {
                const base = fallbackTag.split('-')[0];
                if (AppLanguage.isLocale(base)) {
                    return base;
                }
            }
        } catch {
            // ignore and fall through to default
        }
        return AppLanguage.DEFAULT_LOCALE;
    }

    private static createEmptyTranslationCache(): Partial<Record<Locales, TranslationFunctions>> {
        return {};
    }

    private static isLocale(s: string): s is Locales {
        return AppLanguage.SUPPORTED_LOCALES.includes(s as Locales);
    }

    private static createEmptyTranslationFunctions(): TranslationFunctions {
        return {} as TranslationFunctions;
    }

    private static buildTranslationFunctions(translations: Translations): TranslationFunctions {
        const result = AppLanguage.createEmptyTranslationFunctions();

        const buildNested = (source: Record<string, unknown>, target: Record<string, unknown>): void => {
            for (const key of Object.keys(source)) {
                const value = source[key];
                if (typeof value === 'string') {
                    target[key] = (params?: Record<string, unknown>) => AppLanguage.interpolate(value, params);
                } else if (typeof value === 'object' && value !== null) {
                    // Create nested object
                    target[key] = {};
                    buildNested(value as Record<string, unknown>, target[key] as Record<string, unknown>);
                }
                // Note: functions in translations are not expected
            }
        };

        buildNested(translations as unknown as Record<string, unknown>, result as unknown as Record<string, unknown>);
        return result;
    }

    private static interpolate(template: string, params?: Record<string, unknown>): string {
        if (!params) {
            return template;
        }
        return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
            const value = params[key];
            return value === undefined || value === null ? '' : String(value);
        });
    }
}

/**
 * React hook: current locale and translation functions (returned as LL for usage: LL.onboarding.aboutYou()).
 */
export function useAppLanguage(): UseAppLanguageReturn {
    const instance = AppLanguage.getInstance();
    const locale = instance.getLocale();
    const LL = instance.getTranslationFunctions(locale);
    return { locale, LL };
}
