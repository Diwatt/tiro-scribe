import { ActivityStatus } from '../State/GlobalActivityStatus';

const SUCCESS_RESET_LABEL = 'Terminé';

export function getLabel(
    status: ActivityStatus,
    idleLabel: string,
    pendingLabel?: string,
    successLabel?: string,
): string {
    if (status === ActivityStatus.Pending) {
        return pendingLabel ?? idleLabel;
    }
    if (status === ActivityStatus.Success) {
        return successLabel ?? SUCCESS_RESET_LABEL;
    }
    return idleLabel;
}
