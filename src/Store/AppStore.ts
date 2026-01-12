/**
 * Zustand store for global application state
 */

import {create} from 'zustand';
import {ProcessingPayload} from '../Model/Type';

interface AppState {
    currentSessionId: string | null;
    sessionStartDate: Date | null;
    processingQueue: ProcessingPayload[];
    isProcessing: boolean;
    setCurrentSession: (sessionId: string, startDate: Date) => void;
    addToQueue: (payload: ProcessingPayload) => void;
    setProcessing: (isProcessing: boolean) => void;
    clearQueue: () => void;
}

export const useAppStore = create<AppState>(set => ({
    currentSessionId: null,
    sessionStartDate: null,
    processingQueue: [],
    isProcessing: false,
    setCurrentSession: (sessionId: string, startDate: Date) =>
        set({currentSessionId: sessionId, sessionStartDate: startDate}),
    addToQueue: (payload: ProcessingPayload) =>
        set(state => ({
            processingQueue: [...state.processingQueue, payload],
        })),
    setProcessing: (isProcessing: boolean) => set({isProcessing}),
    clearQueue: () => set({processingQueue: []}),
}));
