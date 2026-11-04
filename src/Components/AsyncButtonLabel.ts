import { ActivityStatus } from '@/State';

export class AsyncButtonLabel {
    public static resolve(
        status: ActivityStatus,
        idleLabel: string,
        pendingLabel?: string,
        successLabel?: string,
    ): string {
        if (status === ActivityStatus.Pending) {
            return pendingLabel ?? idleLabel;
        }
        if (status === ActivityStatus.Success) {
            return successLabel ?? idleLabel;
        }
        return idleLabel;
    }
}
