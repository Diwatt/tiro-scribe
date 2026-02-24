import { observer } from '@legendapp/state/react';
import type React from 'react';
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';
import { Button, useTheme, type ButtonProps } from 'react-native-paper';
import { ActivityStatus, globalActivityStatus } from '../State/GlobalActivityStatus';
import type { ExtendedTheme } from '../theme/AppTheme';

const SUCCESS_RESET_LABEL = 'Terminé';

export interface AsyncButtonProps extends Omit<ButtonProps, 'loading' | 'disabled' | 'children'> {
    /** Controlled status. When omitted the button will read the single global activity status. */
    status?: ActivityStatus;
    idleLabel: string;
    pendingLabel?: string;
    successLabel?: string;
    onPress?: (e: GestureResponderEvent) => void;
    style?: StyleProp<ViewStyle>;
    contentStyle?: React.ComponentProps<typeof Button>['contentStyle'];
}

export function getLabel(status: ActivityStatus, idleLabel: string, pendingLabel?: string, successLabel?: string): string {
    if (status === ActivityStatus.Pending) {
        return pendingLabel ?? idleLabel;
    }
    if (status === ActivityStatus.Success) {
        return successLabel ?? SUCCESS_RESET_LABEL;
    }
    return idleLabel;
}

function AsyncButtonInner(props: AsyncButtonProps): React.JSX.Element {
    const { status: statusProp, idleLabel, pendingLabel, successLabel, onPress, style, contentStyle, icon, mode = 'contained', ...rest } = props;

    const theme = useTheme<ExtendedTheme>();
    const actions = theme.colors.actions;

    // if caller passed an explicit status use it; otherwise fall back to the single global status
    const status = statusProp ?? globalActivityStatus.getStatus() ?? ActivityStatus.Ready;

    const pending = status === ActivityStatus.Pending;
    const success = status === ActivityStatus.Success;

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
            {getLabel(status, idleLabel, pendingLabel, successLabel)}
        </Button>
    );
}

export const AsyncButton = observer(AsyncButtonInner);
