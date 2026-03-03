import type { StatusColors } from '@/Components/Status/Status';
import { Container } from '@/Container';
import { ActivityStatus } from '@/State/GlobalActivityStatus';
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
    const status = Container.globalActivityStatus.getStatus();
    const message = Container.globalActivityStatus.getMessage() ?? '';
    const icon = Container.globalActivityStatus.getIcon();
    return { status, message, icon };
}
