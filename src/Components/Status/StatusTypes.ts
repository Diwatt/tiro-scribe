export enum StatusState {
    READY = 'READY',
    PROCESSING = 'PROCESSING',
    BATCH_WAITING = 'BATCH_WAITING',
    SETUP = 'SETUP',
    ERROR = 'ERROR',
    WARNING = 'WARNING',
}

export namespace StatusState {
    export function getColorKey(state: StatusState): string {
        const stateName = state.toLowerCase();
        const camelCase = stateName
            .split('_')
            .map((word, index) => 
                index === 0 
                    ? word.charAt(0).toLowerCase() + word.slice(1)
                    : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join('');
        // Special case: READY maps to statusIdle for backward compatibility with theme
        if (state === StatusState.READY) {
            return 'statusIdle';
        }
        return `status${camelCase.charAt(0).toUpperCase() + camelCase.slice(1)}`;
    }
}
