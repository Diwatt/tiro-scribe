import { Container } from '@/Core/Container';
import { Localization, useLocalization } from './Localization';

export type { Locales, TranslationFunctions } from './i18n-types';
export type { UseLocalizationReturn } from './Localization';
export { Localization, useLocalization };

export const getDeviceLocale = (): ReturnType<Localization['getDeviceLocale']> =>
    Container.get(Localization).getDeviceLocale();

/** Ensures the singleton is created and locale is set from device (constructor runs on first getInstance()). */
export const initAppLocale = (): void => {
    // Accessing the exported instance forces construction; no-op otherwise
    Container.get(Localization).getLocale();
};

export const SUPPORTED_LOCALES = Localization.SUPPORTED_LOCALES;
