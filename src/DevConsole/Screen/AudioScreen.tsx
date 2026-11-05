import { observer } from '@legendapp/state/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, Snackbar, Surface, Text, useTheme } from 'react-native-paper';
import { Container } from '@/Core/Container';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { AudioState } from '../State/AudioState';
import { SpeechToTextBenchmark } from '../State/SpeechToTextBenchmark';
import { VadPitchSmoke } from '../State/VadPitchSmoke';
import { SpectrogramBench } from '../State/SpectrogramBench';
import { SpectrogramParity } from '../State/SpectrogramParity';
import { AsrBenchmarkCard } from './AsrBenchmarkCard';
import { AudioFilesCard } from './AudioFilesCard';
import { SourceDirectoryCard } from './SourceDirectoryCard';
import { TherapistOnboardingCard } from './TherapistOnboardingCard';
import { VadPitchSmokeCard } from './VadPitchSmokeCard';
import { SpectrogramBenchCard } from './SpectrogramBenchCard';
import { SpectrogramParityCard } from './SpectrogramParityCard';

export const AudioScreen = observer((): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();
    const router = useRouter();
    const state = Container.get(AudioState);
    const spectrogramBench = Container.get(SpectrogramBench);
    const spectrogramParity = Container.get(SpectrogramParity);
    const asrBenchmark = Container.get(SpeechToTextBenchmark);
    const vadPitchSmoke = Container.get(VadPitchSmoke);

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

    const smokeWavPath = vadPitchSmoke.voiceWavPath$.get();
    const smokeSnapshot = vadPitchSmoke.state$.get();

    const benchSnapshot = spectrogramBench.state$.get();
    const parityWavPath = spectrogramParity.wavPath$.get();
    const parityFiltersPath = spectrogramParity.filtersPath$.get();
    const paritySnapshot = spectrogramParity.state$.get();

    const searchParams = useLocalSearchParams<{ autorun?: string }>();
    const autorunAsr = searchParams.autorun === 'asr';
    const autorunSmoke = searchParams.autorun === '1' || searchParams.autorun === 'smoke';

    // Stable reference required: the autorun effects below depend on these callbacks.
    const runAsrBenchmark = React.useCallback((): void => {
        asrBenchmark.runFromForm().catch(() => undefined);
    }, [asrBenchmark]);

    const runVadPitchSmoke = React.useCallback((): void => {
        vadPitchSmoke.runFromForm().catch(() => undefined);
    }, [vadPitchSmoke]);

    const runSpectrogramBench = React.useCallback((): void => {
        spectrogramBench.run().catch(() => undefined);
    }, [spectrogramBench]);

    const runSpectrogramParity = React.useCallback((): void => {
        spectrogramParity.run().catch(() => undefined);
    }, [spectrogramParity]);

    React.useEffect(() => {
        if (autorunSmoke && !vadPitchSmoke.isLoading) {
            runVadPitchSmoke();
        }
    }, [autorunSmoke, runVadPitchSmoke, vadPitchSmoke]);

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
    const handleSmokeWavPathChange = (path: string): void => vadPitchSmoke.setVoiceWavPath(path);
    const handleParityWavPathChange = (path: string): void => spectrogramParity.setWavPath(path);
    const handleParityFiltersPathChange = (path: string): void => spectrogramParity.setFiltersPath(path);
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

            <ScrollView
                style={STYLES.content}
                contentContainerStyle={STYLES.contentContainer}
                keyboardShouldPersistTaps="handled"
            >
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

                <SpectrogramBenchCard
                    isLoading={benchSnapshot.isLoading}
                    entries={benchSnapshot.entries}
                    error={benchSnapshot.error}
                    onRun={runSpectrogramBench}
                />

                <SpectrogramParityCard
                    wavPath={parityWavPath}
                    filtersPath={parityFiltersPath}
                    isLoading={paritySnapshot.isLoading}
                    result={paritySnapshot.result}
                    error={paritySnapshot.error}
                    onWavPathChange={handleParityWavPathChange}
                    onFiltersPathChange={handleParityFiltersPathChange}
                    onRun={runSpectrogramParity}
                />

                <VadPitchSmokeCard
                    voiceWavPath={smokeWavPath}
                    isLoading={smokeSnapshot.isLoading}
                    checks={smokeSnapshot.checks}
                    verdict={smokeSnapshot.verdict}
                    error={smokeSnapshot.error}
                    onWavPathChange={handleSmokeWavPathChange}
                    onRun={runVadPitchSmoke}
                />

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
            </ScrollView>

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
    },
    contentContainer: {
        gap: 16,
        padding: 16,
        paddingBottom: 32,
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
        justifyContent: 'center',
        paddingVertical: 48,
    },
});
