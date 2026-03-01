export enum StatusState {
    Ready = 'ready',
    Processing = 'processing',
    BatchWaiting = 'batch_waiting',
    Setup = 'setup',
    Error = 'error',
    Warning = 'warning',
}

export function getStatusStateColorKey(state: StatusState): string {
    const stateName = state.toLowerCase();
    const camelCase = stateName
        .split('_')
        .map((word, index) =>
            index === 0
                ? word.charAt(0).toLowerCase() + word.slice(1)
                : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join('');
    if (state === StatusState.Ready) {
        return 'statusIdle';
    }
    return `status${camelCase.charAt(0).toUpperCase() + camelCase.slice(1)}`;
}
