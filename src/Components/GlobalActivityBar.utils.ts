import type { StatusColors } from '@/Components/Status/Status';
import { ActivityStatus, globalActivityStatus } from '@/State/GlobalActivityStatus';
import type { ExtendedTheme } from '@/theme/AppTheme';

// coherent mappings for colours and default messages. using record lookups
// means we avoid repetitive switch statements and the mappings stay in sync
// (lint will warn when a case is missing).
const COLOR_MAP: Partial<Record<ActivityStatus, (theme: ExtendedTheme) => StatusColors>> = {
    [ActivityStatus.Pending]: (theme) => theme.colors.statusProcessing,
    [ActivityStatus.Success]: (theme) => theme.colors.statusIdle,
    [ActivityStatus.Warning]: (theme) => theme.colors.statusWarning,
    [ActivityStatus.Error]: (theme) => theme.colors.statusError,
};

export function getStatusColors(theme: ExtendedTheme, status: ActivityStatus): StatusColors | null {
    const getter = COLOR_MAP[status];
    return getter ? getter(theme) : null;
}

// logic for reading highest-priority non-ready entry from the store
export function readFromStore(): { status: ActivityStatus; message: string; icon?: React.ReactNode } {
    const status = globalActivityStatus.getStatus();
    const message = globalActivityStatus.getMessage() ?? '';
    const icon = globalActivityStatus.getIcon();
    return { status, message, icon };
}
