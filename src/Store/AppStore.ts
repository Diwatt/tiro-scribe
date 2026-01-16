/**
 * App Store - OOP class for global application state using Legend-State
 */

import {observable, Observable} from '@legendapp/state';
import {ProcessingPayload} from '../Model/Type';
import {v4 as uuidv4} from 'uuid';

interface AppState {
    currentSessionId: string | null;
    sessionStartDate: Date | null;
    processingQueue: ProcessingPayload[];
    isProcessing: boolean;
}

/**
 * AppStore - Singleton class for managing global application state
 * 
 * Uses Legend-State observables for reactive state management
 * with an OOP interface
 */
class AppStore {
    private state: Observable<AppState>;

    constructor() {
        this.state = observable<AppState>({
            currentSessionId: null,
            sessionStartDate: null,
            processingQueue: [],
            isProcessing: false,
        });
    }

    /**
     * Get the observable state for use in React components
     */
    getState(): Observable<AppState> {
        return this.state;
    }

    /**
     * Get current session ID
     */
    getCurrentSessionId(): string | null {
        return this.state.currentSessionId.get();
    }

    /**
     * Get session start date
     */
    getSessionStartDate(): Date | null {
        return this.state.sessionStartDate.get();
    }

    /**
     * Get processing queue
     */
    getProcessingQueue(): ProcessingPayload[] {
        return this.state.processingQueue.get();
    }

    /**
     * Check if currently processing
     */
    getIsProcessing(): boolean {
        return this.state.isProcessing.get();
    }

    /**
     * Set current session
     */
    setCurrentSession(sessionId: string, startDate: Date): void {
        this.state.currentSessionId.set(sessionId);
        this.state.sessionStartDate.set(startDate);
    }

    /**
     * Start a new session
     * @returns The new session ID
     */
    startNewSession(): string {
        const sessionId = uuidv4();
        const startDate = new Date();
        this.setCurrentSession(sessionId, startDate);
        return sessionId;
    }

    /**
     * Add payload to processing queue
     */
    addToQueue(payload: ProcessingPayload): void {
        const currentQueue = this.state.processingQueue.get();
        this.state.processingQueue.set([...currentQueue, payload]);
    }

    /**
     * Set processing status
     */
    setProcessing(isProcessing: boolean): void {
        this.state.isProcessing.set(isProcessing);
    }

    /**
     * Clear the processing queue
     */
    clearQueue(): void {
        this.state.processingQueue.set([]);
    }
}

// Export singleton instance
export const appStore = new AppStore();

// Export hook for React components (maintains backward compatibility)
// Components using this hook should be wrapped with observer() from @legendapp/state/react
// for proper reactivity, or access state directly
export function useAppStore() {
    const state = appStore.getState();

    return {
        // State values (access these in components wrapped with observer() for reactivity)
        get currentSessionId() {
            return state.currentSessionId.get();
        },
        get sessionStartDate() {
            return state.sessionStartDate.get();
        },
        get processingQueue() {
            return state.processingQueue.get();
        },
        get isProcessing() {
            return state.isProcessing.get();
        },
        // State observable for direct access (use in observer components)
        state: state,
        // Methods
        setCurrentSession: appStore.setCurrentSession.bind(appStore),
        startNewSession: appStore.startNewSession.bind(appStore),
        addToQueue: appStore.addToQueue.bind(appStore),
        setProcessing: appStore.setProcessing.bind(appStore),
        clearQueue: appStore.clearQueue.bind(appStore),
    };
}
