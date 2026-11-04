/**
 * ServicesContext - Provides AI services to the app
 */

import { createContext, useContext } from 'react';

import type { SpeakerProcessor } from '../InferenceModel/Speaker/SpeakerProcessor';

/**
 * Types only—the speaker processor is not loaded at app start.
 * Transcript, Biocode, NER will be wired when those features are added.
 */
export interface ServicesContextType {
    speakerProcessor: SpeakerProcessor | null;
}

export const ServicesContext = createContext<ServicesContextType>({
    speakerProcessor: null,
});

export function useServices(): ServicesContextType {
    return useContext(ServicesContext);
}
