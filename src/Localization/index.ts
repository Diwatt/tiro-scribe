import { Container } from '@/Container';
import { AppLanguage } from './AppLanguage';

export type { UseAppLanguageReturn } from './AppLanguage';
export { AppLanguage, useAppLanguage } from './AppLanguage';
export type { Locales, TranslationFunctions } from './i18n-types';

export const getDeviceLocale = (): ReturnType<AppLanguage['getDeviceLocale']> =>
    Container.get(AppLanguage).getDeviceLocale();

/** Ensures the singleton is created and locale is set from device (constructor runs on first getInstance()). */
export const initAppLocale = (): void => {
    // Accessing the exported instance forces construction; no-op otherwise
    Container.get(AppLanguage).getLocale();
};

export const SUPPORTED_LOCALES = AppLanguage.SUPPORTED_LOCALES;
