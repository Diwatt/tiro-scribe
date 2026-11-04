import { observer } from '@legendapp/state/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, Snackbar, Surface, Text, useTheme } from 'react-native-paper';
import { Container } from '@/Core/Container';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { AudioState } from '../State/AudioState';
import { SpeechToTextBenchmark } from '../State/SpeechToTextBenchmark';
import { AsrBenchmarkCard } from './AsrBenchmarkCard';
import { AudioFilesCard } from './AudioFilesCard';
import { SourceDirectoryCard } from './SourceDirectoryCard';
import { TherapistOnboardingCard } from './TherapistOnboardingCard';

export const AudioScreen = observer((): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();
    const router = useRouter();
    const state = Container.get(AudioState);
    const asrBenchmark = Container.get(SpeechToTextBenchmark);

    const isLoading = state.state$.isLoading.get();
    const files = state.state$.files.get();
    const notification = state.state$.notification.get();
    const inputPath = state.state$.sourceDirectory.get();
    const therapistSourcePath = state.state$.therapistSourcePath.get();
    const segmentStart = state.state$.segmentStart.get();
    const segmentEnd = state.state$.segmentEnd.get();
    const firstUnencryptedPath = state.firstUnencryptedPath;
    const isTherapistFormValid = state.isTherapistFormValid;

    const asrSnapshot = asrBenchmark.state$.get();
    const asrWavPath = asrBenchmark.wavPath$.get();
    const asrLanguage = asrBenchmark.language$.get();

    const searchParams = useLocalSearchParams<{ autorun?: string }>();
    const autorunAsr = searchParams.autorun === 'asr';

    // Stable reference required: the autorun effect below depends on this callback.
    const runAsrBenchmark = React.useCallback((): void => {
        asrBenchmark.runFromForm().catch(() => undefined);
    }, [asrBenchmark]);

    React.useEffect(() => {
        if (autorunAsr && !asrBenchmark.isLoading) {
            runAsrBenchmark();
        }
    }, [autorunAsr, runAsrBenchmark, asrBenchmark]);

    const handleGoBack = (): void => router.back();
    const handleSourceDirectoryChange = (directory: string): void => state.setSourceDirectory(directory);
    const handleScanDirectory = (): void => {
        state.scanDirectory(state.sourceDirectory);
    };
    const handleEncryptAll = (): void => {
        state.encryptAll();
    };
    const handleTherapistSourceChange = (path: string): void => state.setTherapistSourcePath(path);
    const handlePickTherapistSource = (): void => state.setTherapistSourcePath(state.firstUnencryptedPath);
    const handleSegmentStartChange = (raw: string): void => state.setSegmentStart(raw);
    const handleSegmentEndChange = (raw: string): void => state.setSegmentEnd(raw);
    const handleCreateTherapistFromAudio = (): void => {
        state.createTherapistFromAudio();
    };
    const handleAsrWavPathChange = (path: string): void => asrBenchmark.setWavPath(path);
    const handleAsrLanguageChange = (language: string): void => asrBenchmark.setLanguage(language);
    const handleDismissNotification = (): void => state.dismissNotification();
    const handleLoadFixture = (encryptedPath: string, durationMs: number): void => {
        state.loadEncounterFixture(encryptedPath, durationMs);
    };
    const handleEncryptFile = (filePath: string): void => {
        state.encryptFile(filePath);
    };

    return (
        <View style={[STYLES.container, { backgroundColor: theme.colors.background }]}>
            <Surface style={STYLES.header} elevation={1}>
                <View style={STYLES.headerRow}>
                    <IconButton icon="arrow-left" onPress={handleGoBack} />
                    <Text variant="titleLarge" style={STYLES.headerTitle}>
                        Dev Console
                    </Text>
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Ingest raw audio files as encrypted fixtures and load encounter fixtures
                </Text>
            </Surface>

            <View style={STYLES.content}>
                <SourceDirectoryCard
                    directory={inputPath}
                    isLoading={isLoading}
                    hasFiles={files.length > 0}
                    onDirectoryChange={handleSourceDirectoryChange}
                    onScan={handleScanDirectory}
                    onEncryptAll={handleEncryptAll}
                />

                {files.length > 0 && (
                    <AudioFilesCard
                        files={files}
                        isLoading={isLoading}
                        onLoadFixture={handleLoadFixture}
                        onEncryptFile={handleEncryptFile}
                    />
                )}

                {files.length === 0 && !isLoading && inputPath.length > 0 && (
                    <View style={STYLES.emptyState}>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            No audio files found in this directory.
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 4 }}>
                            Supported: .pcm, .wav, .aiff, .aif, .raw
                        </Text>
                    </View>
                )}

                {isLoading && files.length === 0 && (
                    <View style={STYLES.emptyState}>
                        <ActivityIndicator size="large" />
                    </View>
                )}

                <AsrBenchmarkCard
                    wavPath={asrWavPath}
                    language={asrLanguage}
                    isLoading={asrSnapshot.isLoading}
                    error={asrSnapshot.error}
                    result={asrSnapshot.result}
                    onWavPathChange={handleAsrWavPathChange}
                    onLanguageChange={handleAsrLanguageChange}
                    onTranscribe={runAsrBenchmark}
                />

                <TherapistOnboardingCard
                    sourcePath={therapistSourcePath}
                    segmentStart={segmentStart}
                    segmentEnd={segmentEnd}
                    firstUnencryptedPath={firstUnencryptedPath}
                    isFormValid={isTherapistFormValid}
                    isLoading={isLoading}
                    onSourcePathChange={handleTherapistSourceChange}
                    onPickSource={handlePickTherapistSource}
                    onSegmentStartChange={handleSegmentStartChange}
                    onSegmentEndChange={handleSegmentEndChange}
                    onCreate={handleCreateTherapistFromAudio}
                />
            </View>

            <Snackbar
                visible={notification != null}
                onDismiss={handleDismissNotification}
                duration={3000}
                action={{ label: 'Dismiss', onPress: handleDismissNotification }}
            >
                {notification?.message ?? ''}
            </Snackbar>
        </View>
    );
});

const STYLES = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    header: {
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 12,
    },
    headerRow: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    headerTitle: {
        flex: 1,
    },
    emptyState: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        marginTop: 32,
    },
});
