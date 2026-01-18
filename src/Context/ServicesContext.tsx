/**
 * ServicesContext - Provides AI services to the app
 */

import React, {createContext, useContext, ReactNode} from 'react';
import {Biocode} from '../Service/Biocode';
import {Anonymizer} from '../Service/Anonymizer';
import {AudioProcessing} from '../Service/AudioProcessing';

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

export function ServicesProvider({
    children,
    services,
}: ServicesProviderProps): React.JSX.Element {
    return (
        <ServicesContext.Provider value={services}>
            {children}
        </ServicesContext.Provider>
    );
};
