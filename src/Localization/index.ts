import { AppLanguage } from './AppLanguage';

export type { UseAppLanguageReturn } from './AppLanguage';
export { AppLanguage, useAppLanguage } from './AppLanguage';
export type { Locales, TranslationFunctions } from './i18n-types';

export const getDeviceLocale = (): ReturnType<AppLanguage['getDeviceLocale']> => AppLanguage.getInstance().getDeviceLocale();

/** Ensures the singleton is created and locale is set from device (constructor runs on first getInstance()). */
export const initAppLocale = (): void => {
    AppLanguage.getInstance();
};

export const SUPPORTED_LOCALES = AppLanguage.SUPPORTED_LOCALES;
