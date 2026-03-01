/**
 * ServicesContext - Provides AI services to the app
 */

import type React from 'react';
import { createContext, type ReactNode, useContext } from 'react';
import type { Anonymizer } from '../Service/Anonymizer';
import type { AudioProcessing } from '../Service/AudioProcessing';

import type { SpeakerProcessor } from '../Service/SpeakerId/SpeakerProcessor';

/**
 * Types only—Biocode, Anonymizer, AudioProcessing are not loaded at app start.
 * Transcript, Biocode, NER will be wired when those features are added.
 */
interface ServicesContextType {
    speakerProcessor: SpeakerProcessor | null;
    anonymizerService: Anonymizer | null;
    audioProcessingService: AudioProcessing | null;
}

const SERVICES_CONTEXT = createContext<ServicesContextType>({
    speakerProcessor: null,
    anonymizerService: null,
    audioProcessingService: null,
});

export const useServices = () => useContext(SERVICES_CONTEXT);

interface ServicesProviderProps {
    readonly children: ReactNode;
    readonly services: ServicesContextType;
}

export function servicesProvider({ children, services }: ServicesProviderProps): React.JSX.Element {
    return <SERVICES_CONTEXT.Provider value={services}>{children}</SERVICES_CONTEXT.Provider>;
}
