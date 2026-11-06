import { observer } from '@legendapp/state/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, SegmentedButtons, Snackbar, Surface, Text, useTheme } from 'react-native-paper';
import { Container } from '@/Core/Container';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { AudioState } from '../State/AudioState';
import { SessionTranscribe } from '../State/SessionTranscribe';
import { SpeechToTextBenchmark } from '../State/SpeechToTextBenchmark';
import { SpectrogramBench } from '../State/SpectrogramBench';
import { SpectrogramParity } from '../State/SpectrogramParity';
import { VadPitchSmoke } from '../State/VadPitchSmoke';
import { AsrBenchmarkCard } from './AsrBenchmarkCard';
import { AudioFilesCard } from './AudioFilesCard';
import { SessionTranscribeCard } from './SessionTranscribeCard';
import { SourceDirectoryCard } from './SourceDirectoryCard';
import { SpectrogramBenchCard } from './SpectrogramBenchCard';
import { SpectrogramParityCard } from './SpectrogramParityCard';
import { TherapistOnboardingCard } from './TherapistOnboardingCard';
import { VadPitchSmokeCard } from './VadPitchSmokeCard';

type DevConsoleTab = 'psy' | 'sessions' | 'benchmark' | 'ingest';

const TAB_DESCRIPTIONS: Record<DevConsoleTab, string> = {
    psy: 'Voice ID: enroll the therapist profile from a recording segment, then sessions can be attributed to that voice',
    sessions: 'Run an encrypted session (.dat) through the pull pipeline: native decryption, VAD segmentation, Parakeet ASR',
    benchmark:
        'Model benchmarks on device: ASR transcription latency (RTF), VAD/Pitch smoke checks, spectrogram latency and native/JS parity',
    ingest: 'Fixture tooling: scan a device directory, encrypt raw audio into encrypted .dat fixtures, load encounter fixtures',
};

export const AudioScreen = observer((): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();
    const router = useRouter();
    const state = Container.get(AudioState);
    const spectrogramBench = Container.get(SpectrogramBench);
    const spectrogramParity = Container.get(SpectrogramParity);
    const asrBenchmark = Container.get(SpeechToTextBenchmark);
    const vadPitchSmoke = Container.get(VadPitchSmoke);
    const sessionTranscribe = Container.get(SessionTranscribe);

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

    const sessionDatPath = sessionTranscribe.datPath$.get();
    const sessionSnapshot = sessionTranscribe.state$.get();

    const searchParams = useLocalSearchParams<{ autorun?: string }>();
    const autorunAsr = searchParams.autorun === 'asr';
    const autorunSmoke = searchParams.autorun === '1' || searchParams.autorun === 'smoke';
    const [activeTab, setActiveTab] = React.useState<DevConsoleTab>(() =>
        autorunAsr || autorunSmoke ? 'benchmark' : 'psy',
    );

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

    const runSessionTranscribe = React.useCallback((): void => {
        sessionTranscribe.runFromForm().catch(() => undefined);
    }, [sessionTranscribe]);

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
    const handleSessionDatPathChange = (path: string): void => sessionTranscribe.setDatPath(path);
    const handleDismissNotification = (): void => state.dismissNotification();
    const handleLoadFixture = (encryptedPath: string, durationMs: number): void => {
        state.loadEncounterFixture(encryptedPath, durationMs);
    };
    const handleEncryptFile = (filePath: string): void => {
        state.encryptFile(filePath);
    };

    const renderBenchmarkCards = (): React.JSX.Element => (
        <>
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

            <VadPitchSmokeCard
                voiceWavPath={smokeWavPath}
                isLoading={smokeSnapshot.isLoading}
                checks={smokeSnapshot.checks}
                verdict={smokeSnapshot.verdict}
                error={smokeSnapshot.error}
                onWavPathChange={handleSmokeWavPathChange}
                onRun={runVadPitchSmoke}
            />

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
        </>
    );

    const renderIngestSection = (): React.JSX.Element => (
        <>
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
        </>
    );

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
                    {TAB_DESCRIPTIONS[activeTab]}
                </Text>
            </Surface>

            <View style={STYLES.tabs}>
                <SegmentedButtons
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as DevConsoleTab)}
                    buttons={[
                        { value: 'psy', label: 'Psy' },
                        { value: 'sessions', label: 'Sessions' },
                        { value: 'benchmark', label: 'Benchmark' },
                        { value: 'ingest', label: 'Ingest' },
                    ]}
                />
            </View>

            <ScrollView
                style={STYLES.content}
                contentContainerStyle={STYLES.contentContainer}
                keyboardShouldPersistTaps="handled"
            >
                {activeTab === 'psy' && (
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
                )}

                {activeTab === 'sessions' && (
                    <SessionTranscribeCard
                        datPath={sessionDatPath}
                        isLoading={sessionSnapshot.isLoading}
                        utterances={sessionSnapshot.utterances}
                        elapsedMs={sessionSnapshot.elapsedMs}
                        timings={sessionSnapshot.timings}
                        error={sessionSnapshot.error}
                        onDatPathChange={handleSessionDatPathChange}
                        onTranscribe={runSessionTranscribe}
                    />
                )}

                {activeTab === 'benchmark' && renderBenchmarkCards()}

                {activeTab === 'ingest' && renderIngestSection()}
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
    tabs: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
});
