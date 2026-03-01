import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { appLogger } from '../Service/Logger';

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
    public override state: State = { error: null };

    public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        appLogger.error(`${LOG_PREFIX} AppErrorBoundary caught render error:`, {
            error,
            errorMessage: error?.message,
            errorStack: error?.stack,
            componentStack: errorInfo?.componentStack,
        });
    }

    public static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    public override render(): ReactNode {
        if (this.state.error) {
            return (
                <View style={STYLES.container}>
                    <Text style={STYLES.title}>Something went wrong</Text>
                    <Text style={STYLES.message} selectable>
                        {this.state.error?.message ?? String(this.state.error)}
                    </Text>
                    <Text style={STYLES.hint}>
                        Check Metro or Xcode console for details. Reload the app to try again.
                    </Text>
                </View>
            );
        }
        return this.props.children;
    }
}

const STYLES = StyleSheet.create({
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
