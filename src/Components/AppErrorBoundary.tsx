import React, {Component, type ErrorInfo, type ReactNode} from 'react';
import {View, Text, StyleSheet} from 'react-native';

const LOG_PREFIX = '[TiroScribe]';

interface State {
    error: Error | null;
}

interface Props {
    children: ReactNode;
}

/**
 * Catches React render errors and logs them. Prevents white-screen by showing
 * a fallback. For native crashes (app closes with no logs), run from Xcode
 * (iOS) or Android Studio / adb logcat (Android) to see the stack trace.
 */
export class AppErrorBoundary extends Component<Props, State> {
    public override state: State = {error: null};

    public static getDerivedStateFromError(error: Error): State {
        return {error};
    }

    public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error(
            `${LOG_PREFIX} AppErrorBoundary caught render error:`,
            error?.message,
            error?.stack,
            '\nComponent stack:',
            errorInfo?.componentStack
        );
    }

    public override render(): ReactNode {
        if (this.state.error) {
            return (
                <View style={styles.container}>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.message} selectable>
                        {this.state.error?.message ?? String(this.state.error)}
                    </Text>
                    <Text style={styles.hint}>
                        Check Metro or Xcode console for details. Reload the app to try again.
                    </Text>
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#FAFAFA',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2C2C2C',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 16,
    },
    hint: {
        fontSize: 12,
        color: '#94A3B8',
        textAlign: 'center',
    },
});
