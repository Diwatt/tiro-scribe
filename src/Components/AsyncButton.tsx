import { observer } from '@legendapp/state/react';
import type React from 'react';
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import { AsyncStatus, appAsyncStatus } from '../State/AppAsyncStatus';
import type { ExtendedTheme } from '../theme/AppTheme';

const SUCCESS_RESET_LABEL = 'Terminé';

export interface AsyncButtonProps extends Omit<React.ComponentProps<typeof Button>, 'loading' | 'disabled' | 'children'> {
    /** When set, status is read from AppAsyncStatus (state drives display). Mutually exclusive with status. */
    statusKey?: string;
    /** Controlled status. Mutually exclusive with statusKey. */
    status?: AsyncStatus;
    idleLabel: string;
    pendingLabel?: string;
    successLabel?: string;
    onPress?: (e: GestureResponderEvent) => void;
    style?: StyleProp<ViewStyle>;
    contentStyle?: React.ComponentProps<typeof Button>['contentStyle'];
}

function getLabel(
    status: AsyncStatus,
    idleLabel: string,
    pendingLabel?: string,
    successLabel?: string,
    statusKey?: string,
): string {
    if (statusKey ? appAsyncStatus.is(statusKey, AsyncStatus.Pending) : status === AsyncStatus.Pending) {
        return pendingLabel ?? idleLabel;
    }
    if (statusKey ? appAsyncStatus.is(statusKey, AsyncStatus.Success) : status === AsyncStatus.Success) {
        return successLabel ?? SUCCESS_RESET_LABEL;
    }
    return idleLabel;
}

function AsyncButtonInner(props: AsyncButtonProps): React.JSX.Element {
    const { statusKey, status: statusProp, idleLabel, pendingLabel, successLabel, onPress, style, contentStyle, icon, mode = 'contained', ...rest } = props;

    const theme = useTheme<ExtendedTheme>();
    const actions = theme.colors.actions;

    const statusFromStore = statusKey ? appAsyncStatus.getStatus(statusKey) : undefined;
    const status = statusFromStore ?? statusProp ?? AsyncStatus.Idle;

    const pending = statusKey ? appAsyncStatus.is(statusKey, AsyncStatus.Pending) : status === AsyncStatus.Pending;
    const success = statusKey ? appAsyncStatus.is(statusKey, AsyncStatus.Success) : status === AsyncStatus.Success;

    const backgroundColor = success ? actions.success.background : undefined;
    const labelColor = success ? actions.success.text : undefined;
    const disabled = pending || success;

    return (
        <Button
            {...rest}
            mode={mode}
            loading={pending}
            disabled={disabled}
            onPress={onPress}
            icon={icon}
            style={[style, backgroundColor ? { backgroundColor } : undefined]}
            contentStyle={contentStyle}
            labelStyle={labelColor ? { color: labelColor } : undefined}
        >
            {getLabel(status, idleLabel, pendingLabel, successLabel, statusKey)}
        </Button>
    );
}

export const AsyncButton = observer(AsyncButtonInner);
