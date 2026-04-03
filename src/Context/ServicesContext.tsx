/**
 * ServicesContext - Provides AI services to the app
 */

import { createContext, useContext } from 'react';
import type { Anonymizer } from '../Service/Anonymizer';
import type { AudioProcessing } from '../Service/AudioProcessing';

import type { SpeakerProcessor } from '../InferenceModel/Speaker/SpeakerProcessor';

/**
 * Types only—Biocode, Anonymizer, AudioProcessing are not loaded at app start.
 * Transcript, Biocode, NER will be wired when those features are added.
 */
export interface ServicesContextType {
    speakerProcessor: SpeakerProcessor | null;
    anonymizerService: Anonymizer | null;
    audioProcessingService: AudioProcessing | null;
}

export const ServicesContext = createContext<ServicesContextType>({
    speakerProcessor: null,
    anonymizerService: null,
    audioProcessingService: null,
});

export function useServices(): ServicesContextType {
    return useContext(ServicesContext);
}
