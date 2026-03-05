import { observer } from '@legendapp/state/react';
import type React from 'react';
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';
import { Button, type ButtonProps, useTheme } from 'react-native-paper';
import { Container } from '@/Container';
import { ActivityStatus, GlobalActivityStatus } from '../State/GlobalActivityStatus';
import type { ExtendedTheme } from '../theme/AppTheme';
import { getLabel } from './AsyncButtonUtils';

export interface AsyncButtonProps extends Omit<ButtonProps, 'loading' | 'disabled' | 'children'> {
    readonly status?: ActivityStatus;
    readonly idleLabel: string;
    readonly pendingLabel?: string;
    readonly successLabel?: string;
    readonly onPress?: (e: GestureResponderEvent) => void;
    readonly style?: StyleProp<ViewStyle>;
    readonly contentStyle?: React.ComponentProps<typeof Button>['contentStyle'];
}

export function AsyncButtonInner(props: Readonly<AsyncButtonProps>): React.JSX.Element {
    const {
        status: statusProp,
        idleLabel,
        pendingLabel,
        successLabel,
        onPress,
        style,
        contentStyle,
        icon,
        mode = 'contained',
        ...rest
    } = props;

    const theme = useTheme<ExtendedTheme>();
    const actions = theme.colors.actions;

    // if caller passed an explicit status use it; otherwise fall back to the single global status
    const status = statusProp ?? Container.get(GlobalActivityStatus).getStatus() ?? ActivityStatus.Ready;

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

const OBSERVED_ASYNC_BUTTON = observer(AsyncButtonInner);

export function AsyncButton(props: Readonly<AsyncButtonProps>): React.JSX.Element {
    return <OBSERVED_ASYNC_BUTTON {...props} />;
}

export { getLabel } from './AsyncButtonUtils';
