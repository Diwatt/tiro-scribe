/**
 * ServicesContext - Provides AI services to the app
 */

import type React from 'react';
import { createContext, type ReactNode, useContext } from 'react';
import type { Anonymizer } from '../Service/Anonymizer';
import type { AudioProcessing } from '../Service/AudioProcessing';
import type { Biocode } from '../Service/Biocode';

/**
 * Types only—Biocode, Anonymizer, AudioProcessing are not loaded at app start.
 * Transcript, Biocode, NER will be wired when those features are added.
 */
interface ServicesContextType {
    biocodeService: Biocode | null;
    anonymizerService: Anonymizer | null;
    audioProcessingService: AudioProcessing | null;
}

const ServicesContext = createContext<ServicesContextType>({
    biocodeService: null,
    anonymizerService: null,
    audioProcessingService: null,
});

export const useServices = () => useContext(ServicesContext);

interface ServicesProviderProps {
    children: ReactNode;
    services: ServicesContextType;
}

export function ServicesProvider({ children, services }: ServicesProviderProps): React.JSX.Element {
    return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}
