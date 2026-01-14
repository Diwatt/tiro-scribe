/**
 * Zustand store for global application state
 */

import {create} from 'zustand';
import {ProcessingPayload} from '../Model/Type';
import {v4 as uuidv4} from 'uuid';

interface AppState {
    currentSessionId: string | null;
    sessionStartDate: Date | null;
    processingQueue: ProcessingPayload[];
    isProcessing: boolean;
    setCurrentSession: (sessionId: string, startDate: Date) => void;
    startNewSession: () => string;
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
    startNewSession: () => {
        const sessionId = uuidv4();
        const startDate = new Date();
        set({currentSessionId: sessionId, sessionStartDate: startDate});
        return sessionId;
    },
    addToQueue: (payload: ProcessingPayload) =>
        set(state => ({
            processingQueue: [...state.processingQueue, payload],
        })),
    setProcessing: (isProcessing: boolean) => set({isProcessing}),
    clearQueue: () => set({processingQueue: []}),
}));
