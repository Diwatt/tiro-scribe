/**
 * Home Screen
 * Action-oriented interface for therapists
 * 
 * Focus: Start session, check AI processing status, view latest encounters
 * Note: Starting a recording = starting a new encounter/session
 */

import React, {useEffect, useState} from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import {
    Text,
    Surface,
    useTheme,
    Card,
    Chip,
    ProgressBar,
    Avatar,
    Button,
} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {observer} from '@legendapp/state/react';
import {RecordButton} from '@/Components';
import {useAudioRecording} from '@Recording/Hook/useAudioRecording';
import {
    Mic,
    Clock,
    Shield,
    CheckCircle,
    Hourglass,
    FileText,
} from 'lucide-react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {useQueueStore} from '@/Store/useQueueStore';

dayjs.extend(relativeTime);

/**
 * HomeScreen Component
 *
 * Action-oriented design focusing on:
 * - Starting new sessions (recording)
 * - Monitoring AI processing queue
 * - Viewing recent encounters with status
 */
export const HomeScreen: React.FC = observer(() => {
    const theme = useTheme();
    const navigation = useNavigation();
    const [refreshing, setRefreshing] = useState(false);

    // Queue status
    const {stats, isProcessing, refreshStats, state} = useQueueStore();
    const queueLength = stats.pending + stats.processing;

    // Audio recording store (OOP class with Legend-State observables)
    const audioRecording = useAudioRecording();

    useEffect(() => {
        loadHomeData();
        // Refresh queue stats periodically
        const interval = setInterval(() => {
            refreshStats();
        }, 2000); // Every 2 seconds

        return () => clearInterval(interval);
    }, []);

    const loadHomeData = async () => {
        await refreshStats();
        // TODO: Load recent encounters from database
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadHomeData();
        setRefreshing(false);
    };

    const handleStartSession = async () => {
        try {
            if (audioRecording.isRecording) {
                await audioRecording.stopRecording();
                navigation.navigate('Record' as never);
            } else {
                // Starting recording = starting a new encounter/session
                await audioRecording.startRecording();
            }
        } catch (err) {
            console.error('Recording error:', err);
        }
    };

    const handleViewSessions = () => {
        navigation.navigate('Sessions' as never);
    };

    // Calculate estimated time (mock for now - TODO: calculate from queue items)
    const estimatedTime = queueLength > 0 ? `${queueLength * 2} min` : null;

    // Mock data for recent encounters
    // TODO: Replace with real database queries
    const recentEncounters = [
        {
            id: '1',
            subjectBiocode: 'SUBJ-****-A3F2',
            date: dayjs().subtract(1, 'hour'),
            duration: '45 min',
            status: 'processing', // 'processing' | 'completed'
        },
        {
            id: '2',
            subjectBiocode: 'SUBJ-****-B7C1',
            date: dayjs().subtract(3, 'hours'),
            duration: '60 min',
            status: 'completed',
        },
        {
            id: '3',
            subjectBiocode: 'SUBJ-****-D9E4',
            date: dayjs().subtract(1, 'day'),
            duration: '30 min',
            status: 'completed',
        },
    ];

    return (
        <View
            style={[
                styles.container,
                {backgroundColor: theme.colors.background},
            ]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.primary}
                    />
                }>
                {/* Pipeline Status Header */}
                <Surface
                    style={[
                        styles.statusHeader,
                        {backgroundColor: theme.colors.surface},
                    ]}>
                    <View style={styles.statusHeaderTop}>
                        <Text
                            variant="titleMedium"
                            style={[
                                styles.statusTitle,
                                {color: theme.colors.onSurface},
                            ]}>
                            Processing Pipeline
                        </Text>
                        {queueLength > 0 && (
                            <Chip
                                mode="flat"
                                compact
                                style={[
                                    styles.queueChip,
                                    {backgroundColor: theme.colors.secondaryContainer},
                                ]}
                                textStyle={{
                                    color: theme.colors.onSecondaryContainer,
                                    fontSize: 12,
                                }}>
                                {queueLength} in queue
                            </Chip>
                        )}
                    </View>

                    {/* Pipeline Stages */}
                    <View style={styles.pipelineContainer}>
                        {/* Stage 1: Record */}
                        <View style={styles.pipelineStage}>
                            <View
                                style={[
                                    styles.stageIcon,
                                    audioRecording.isRecording && [
                                        styles.stageIconActive,
                                        {backgroundColor: theme.colors.error},
                                    ],
                                ]}>
                                <Mic
                                    size={16}
                                    color={
                                        audioRecording.isRecording
                                            ? theme.colors.onError
                                            : theme.colors.onSurfaceVariant
                                    }
                                />
                            </View>
                            <Text
                                variant="labelSmall"
                                style={[
                                    styles.stageLabel,
                                    audioRecording.isRecording && {
                                        color: theme.colors.error,
                                        fontWeight: '600',
                                    },
                                    !audioRecording.isRecording && {
                                        color: theme.colors.onSurfaceVariant,
                                    },
                                ]}>
                                Record
                            </Text>
                        </View>

                        {/* Connector */}
                        <View
                            style={[
                                styles.pipelineConnector,
                                {
                                    backgroundColor:
                                        audioRecording.isRecording ||
                                        queueLength > 0
                                            ? theme.colors.primary
                                            : theme.colors.outlineVariant,
                                },
                            ]}
                        />

                        {/* Stage 2: Transcribe */}
                        <View style={styles.pipelineStage}>
                            <View
                                style={[
                                    styles.stageIcon,
                                    isProcessing &&
                                        stats.processing > 0 && [
                                            styles.stageIconActive,
                                            {backgroundColor: theme.colors.primary},
                                        ],
                                ]}>
                                <FileText
                                    size={16}
                                    color={
                                        isProcessing && stats.processing > 0
                                            ? theme.colors.onPrimary
                                            : theme.colors.onSurfaceVariant
                                    }
                                />
                            </View>
                            <Text
                                variant="labelSmall"
                                style={[
                                    styles.stageLabel,
                                    isProcessing &&
                                        stats.processing > 0 && {
                                            color: theme.colors.primary,
                                            fontWeight: '600',
                                        },
                                    !(isProcessing && stats.processing > 0) && {
                                        color: theme.colors.onSurfaceVariant,
                                    },
                                ]}>
                                Transcribe
                            </Text>
                            {stats.processing > 0 && (
                                <Text
                                    variant="labelSmall"
                                    style={[
                                        styles.stageCount,
                                        {color: theme.colors.primary},
                                    ]}>
                                    {stats.processing}
                                </Text>
                            )}
                        </View>

                        {/* Connector */}
                        <View
                            style={[
                                styles.pipelineConnector,
                                {
                                    backgroundColor:
                                        stats.processing > 0 ||
                                        stats.pending > 0
                                            ? theme.colors.primary
                                            : theme.colors.outlineVariant,
                                },
                            ]}
                        />

                        {/* Stage 3: Anonymize */}
                        <View style={styles.pipelineStage}>
                            <View
                                style={[
                                    styles.stageIcon,
                                    stats.pending > 0 && [
                                        styles.stageIconActive,
                                        {backgroundColor: theme.colors.secondary},
                                    ],
                                ]}>
                                <Shield
                                    size={16}
                                    color={
                                        stats.pending > 0
                                            ? theme.colors.onSecondary
                                            : theme.colors.onSurfaceVariant
                                    }
                                />
                            </View>
                            <Text
                                variant="labelSmall"
                                style={[
                                    styles.stageLabel,
                                    stats.pending > 0 && {
                                        color: theme.colors.secondary,
                                        fontWeight: '600',
                                    },
                                    stats.pending === 0 && {
                                        color: theme.colors.onSurfaceVariant,
                                    },
                                ]}>
                                Anonymize
                            </Text>
                            {stats.pending > 0 && (
                                <Text
                                    variant="labelSmall"
                                    style={[
                                        styles.stageCount,
                                        {color: theme.colors.secondary},
                                    ]}>
                                    {stats.pending}
                                </Text>
                            )}
                        </View>

                        {/* Connector */}
                        <View
                            style={[
                                styles.pipelineConnector,
                                {
                                    backgroundColor:
                                        stats.completed > 0
                                            ? theme.colors.tertiary
                                            : theme.colors.outlineVariant,
                                },
                            ]}
                        />

                        {/* Stage 4: Complete */}
                        <View style={styles.pipelineStage}>
                            <View
                                style={[
                                    styles.stageIcon,
                                    stats.completed > 0 && [
                                        styles.stageIconActive,
                                        {backgroundColor: theme.colors.tertiary},
                                    ],
                                ]}>
                                <CheckCircle
                                    size={16}
                                    color={
                                        stats.completed > 0
                                            ? theme.colors.onTertiary
                                            : theme.colors.onSurfaceVariant
                                    }
                                />
                            </View>
                            <Text
                                variant="labelSmall"
                                style={[
                                    styles.stageLabel,
                                    stats.completed > 0 && {
                                        color: theme.colors.tertiary,
                                        fontWeight: '600',
                                    },
                                    stats.completed === 0 && {
                                        color: theme.colors.onSurfaceVariant,
                                    },
                                ]}>
                                Complete
                            </Text>
                            {stats.completed > 0 && (
                                <Text
                                    variant="labelSmall"
                                    style={[
                                        styles.stageCount,
                                        {color: theme.colors.tertiary},
                                    ]}>
                                    {stats.completed}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Current Status Text */}
                    <View style={styles.currentStatusContainer}>
                        {audioRecording.isRecording ? (
                            <Text
                                variant="bodySmall"
                                style={[
                                    styles.currentStatus,
                                    {color: theme.colors.error},
                                ]}>
                                ● Recording in progress...
                            </Text>
                        ) : isProcessing ? (
                            <Text
                                variant="bodySmall"
                                style={[
                                    styles.currentStatus,
                                    {color: theme.colors.primary},
                                ]}>
                                ● Processing {stats.processing} session
                                {stats.processing > 1 ? 's' : ''}...
                            </Text>
                        ) : queueLength > 0 ? (
                            <Text
                                variant="bodySmall"
                                style={[
                                    styles.currentStatus,
                                    {color: theme.colors.secondary},
                                ]}>
                                ● {queueLength} session{queueLength > 1 ? 's' : ''} in queue
                            </Text>
                        ) : (
                            <Text
                                variant="bodySmall"
                                style={[
                                    styles.currentStatus,
                                    {color: theme.colors.onSurfaceVariant},
                                ]}>
                                ● System ready
                            </Text>
                        )}
                    </View>
                </Surface>

                {/* Dynamic Queue Status Widget */}
                {queueLength > 0 ? (
                    <Surface
                        style={[
                            styles.queueCard,
                            {backgroundColor: theme.colors.secondaryContainer},
                        ]}>
                        <View style={styles.queueHeader}>
                            <View style={styles.queueHeaderLeft}>
                                <Hourglass
                                    size={20}
                                    color={theme.colors.onSecondaryContainer}
                                />
                                <Text
                                    variant="titleMedium"
                                    style={[
                                        styles.queueTitle,
                                        {color: theme.colors.onSecondaryContainer},
                                    ]}>
                                    Processing {queueLength} session
                                    {queueLength > 1 ? 's' : ''}
                                </Text>
                            </View>
                            {estimatedTime && (
                                <Text
                                    variant="bodySmall"
                                    style={[
                                        styles.queueTime,
                                        {color: theme.colors.onSecondaryContainer},
                                    ]}>
                                    ~{estimatedTime}
                                </Text>
                            )}
                        </View>
                        <ProgressBar
                            indeterminate={isProcessing}
                            progress={isProcessing ? undefined : 0.5}
                            color={theme.colors.secondary}
                            style={styles.progressBar}
                        />
                    </Surface>
                ) : (
                    <Surface
                        style={[
                            styles.readyBadge,
                            {backgroundColor: theme.colors.surfaceVariant},
                        ]}>
                        <View style={styles.readyContent}>
                            <Shield
                                size={16}
                                color={theme.colors.primary}
                            />
                            <Text
                                variant="labelSmall"
                                style={[
                                    styles.readyText,
                                    {color: theme.colors.onSurfaceVariant},
                                ]}>
                                System Ready & Secure
                            </Text>
                        </View>
                    </Surface>
                )}

                {/* Recent Encounters List */}
                <View style={styles.sectionHeader}>
                    <Text
                        variant="titleMedium"
                        style={[
                            styles.sectionTitle,
                            {color: theme.colors.onBackground},
                        ]}>
                        Recent Encounters
                    </Text>
                    <TouchableOpacity onPress={handleViewSessions}>
                        <Text
                            variant="labelLarge"
                            style={[
                                styles.seeAllText,
                                {color: theme.colors.primary},
                            ]}>
                            See All
                        </Text>
                    </TouchableOpacity>
                </View>

                {recentEncounters.map((encounter) => (
                    <Card
                        key={encounter.id}
                        style={[
                            styles.encounterCard,
                            {backgroundColor: theme.colors.surface},
                        ]}
                        onPress={handleViewSessions}
                        mode="outlined">
                        <Card.Content style={styles.encounterContent}>
                            <View style={styles.encounterLeft}>
                                <View style={styles.encounterInfo}>
                                    <Text
                                        variant="titleSmall"
                                        style={[
                                            styles.encounterSubject,
                                            {color: theme.colors.onSurface},
                                        ]}>
                                        {encounter.subjectBiocode}
                                    </Text>
                                    <View style={styles.encounterMeta}>
                                        <Text
                                            variant="bodySmall"
                                            style={[
                                                styles.encounterTime,
                                                {color: theme.colors.onSurfaceVariant},
                                            ]}>
                                            {encounter.date.fromNow()}
                                        </Text>
                                        <Text
                                            variant="bodySmall"
                                            style={[
                                                styles.encounterDuration,
                                                {color: theme.colors.onSurfaceVariant},
                                            ]}>
                                            • {encounter.duration}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.encounterRight}>
                                {encounter.status === 'processing' ? (
                                    <View style={styles.statusIcon}>
                                        <Hourglass
                                            size={20}
                                            color={theme.colors.secondary}
                                        />
                                    </View>
                                ) : (
                                    <View style={styles.statusIcon}>
                                        <CheckCircle
                                            size={20}
                                            color={theme.colors.tertiary}
                                        />
                                    </View>
                                )}
                            </View>
                        </Card.Content>
                    </Card>
                ))}

                {/* Bottom padding for FAB */}
                <View style={styles.bottomPadding} />
            </ScrollView>

            {/* Floating Record Button */}
            <RecordButton
                isRecording={audioRecording.isRecording}
                onPress={handleStartSession}
                disabled={false}
                position="bottom-right"
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    statusHeader: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        elevation: 1,
    },
    statusHeaderTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusTitle: {
        fontWeight: '600',
    },
    queueChip: {
        height: 24,
    },
    pipelineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    pipelineStage: {
        alignItems: 'center',
        flex: 1,
    },
    stageIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    stageIconActive: {
        borderWidth: 0,
    },
    stageLabel: {
        fontSize: 11,
        textAlign: 'center',
    },
    stageCount: {
        fontSize: 10,
        marginTop: 2,
        fontWeight: '600',
    },
    pipelineConnector: {
        height: 2,
        flex: 1,
        marginHorizontal: 4,
        marginBottom: 20,
    },
    currentStatusContainer: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    currentStatus: {
        textAlign: 'center',
        fontWeight: '500',
    },
    queueCard: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        elevation: 1,
    },
    queueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    queueHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    queueTitle: {
        fontWeight: '600',
    },
    queueTime: {
        opacity: 0.8,
    },
    progressBar: {
        height: 4,
        borderRadius: 2,
    },
    readyBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 16,
        elevation: 0,
    },
    readyContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    readyText: {
        fontWeight: '500',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 8,
    },
    sectionTitle: {
        fontWeight: '600',
    },
    seeAllText: {
        fontWeight: '500',
    },
    encounterCard: {
        marginBottom: 8,
        elevation: 0,
    },
    encounterContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    encounterLeft: {
        flex: 1,
    },
    encounterInfo: {
        flex: 1,
    },
    encounterSubject: {
        fontWeight: '600',
        marginBottom: 4,
    },
    encounterMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    encounterTime: {
        opacity: 0.7,
    },
    encounterDuration: {
        opacity: 0.7,
    },
    encounterRight: {
        marginLeft: 12,
    },
    statusIcon: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomPadding: {
        height: 100, // Space for FAB
    },
});
