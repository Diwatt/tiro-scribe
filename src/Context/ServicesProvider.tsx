import type { ReactElement, ReactNode } from 'react';
import type { ServicesContextType } from './ServicesContext';
import { ServicesContext } from './ServicesContext';

export interface ServicesProviderProps {
    readonly children: ReactNode;
    readonly services: ServicesContextType;
}

export function ServicesProvider({ children, services }: ServicesProviderProps): ReactElement {
    return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}
