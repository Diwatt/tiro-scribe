import React, {useEffect, useState} from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Platform,
    TouchableOpacity,
} from 'react-native';
import {
    Text,
    Surface,
    useTheme,
    FAB,
    ProgressBar,
    ActivityIndicator,
    IconButton,
} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {observer} from '@legendapp/state/react';
import {useAudioRecording} from '@Service/AudioRecording';
import {
    Mic,
    ShieldCheck,
    CheckCircle2,
    Loader2,
    Clock,
    FileText,
    ChevronRight,
} from 'lucide-react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/en';
import {useQueueStore} from '@/Store/useQueueStore';
import {database} from '@/Service/Database';
import {queueItemsTable, type QueueItemSchema} from '@Entity/QueueItem';
import {QueueItemStatus, PipelineStage} from '@Entity/Type';
import {desc} from 'drizzle-orm';

dayjs.extend(relativeTime);

export const Home = observer((): React.JSX.Element => {
    const theme = useTheme();
    const statusIdleColors = (theme.colors as any).statusIdle as {
        background: string;
        text: string;
        accent: string;
        iconBackground: string;
        shadowColor: string;
    };
    const navigation = useNavigation();
    const [refreshing, setRefreshing] = useState(false);
    const [queueItems, setQueueItems] = useState<QueueItemSchema[]>([]);

    const {stats, refreshStats} = useQueueStore();
    const audioRecording = useAudioRecording();
    const queueLength = stats.pending + stats.processing + stats.completed;
    const isProcessing = stats.processing > 0 || stats.pending > 0;
    const currentItem = queueItems.find(i => i.status === QueueItemStatus.PROCESSING);

    useEffect(() => {
        loadHomeData();
        const interval = setInterval(() => {
            refreshStats();
            loadQueueItems();
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const loadQueueItems = async () => {
        try {
            const items = await database
                .select()
                .from(queueItemsTable)
                .orderBy(desc(queueItemsTable.createdAt))
                .limit(20);
            setQueueItems(items);
        } catch (error) {
            console.error(error);
        }
    };

    const loadHomeData = async () => {
        await refreshStats();
        await loadQueueItems();
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadHomeData();
        setRefreshing(false);
    };

    const handleStartSession = async () => {
        (navigation as any).navigate('Recording');
    };

    const getStatusConfig = (status: QueueItemStatus) => {
        switch (status) {
            case QueueItemStatus.PROCESSING:
                return { icon: Loader2, color: '#F59E0B', label: 'Processing', background: '#FEF3C7' };
            case QueueItemStatus.COMPLETED:
                return { icon: CheckCircle2, color: '#10B981', label: 'Completed', background: '#D1FAE5' };
            case QueueItemStatus.FAILED:
                return { icon: FileText, color: '#EF4444', label: 'Error', background: '#FEE2E2' };
            default:
                return { icon: Clock, color: '#64748B', label: 'Pending', background: '#F1F5F9' };
        }
    };

    return (
        <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={statusIdleColors.text} />
                }
            >
                <Surface style={[
                    styles.heroCard,
                    {
                        backgroundColor: statusIdleColors.background,
                        shadowColor: statusIdleColors.shadowColor,
                    },
                ]}>
                    <View style={styles.heroWatermark}>
                        <ShieldCheck size={140} color={statusIdleColors.text} opacity={0.05} />
                    </View>

                    {isProcessing ? (
                        <View>
                            <View style={styles.rowBetween}>
                                <View style={[styles.badgeProcessing, {backgroundColor: statusIdleColors.text}]}>
                                    <ActivityIndicator size={14} color="#FFF" />
                                    <Text style={styles.badgeText}>PROCESSING</Text>
                                </View>
                                <Text style={[styles.heroTime, {color: statusIdleColors.text}]}>~ 4 min</Text>
                            </View>

                            <Text style={[styles.heroTitle, {color: statusIdleColors.text}]}>
                                Processing subject
                            </Text>
                            <Text style={[styles.heroSubtitle, {color: statusIdleColors.text}]}>
                                {currentItem ? `ID: ${currentItem.encounterUuid.slice(0,8)}...` : "Preparing..."}
                            </Text>

                            {currentItem && (
                                <View style={styles.progressContainer}>
                                    <View style={styles.rowBetween}>
                                        <Text style={[styles.progressLabel, {color: statusIdleColors.text}]}>
                                            {currentItem.pipelineStage || 'Initialization'}
                                        </Text>
                                        <Text style={[styles.progressLabel, {color: statusIdleColors.text}]}>
                                            {currentItem.progressPercent}%
                                        </Text>
                                    </View>
                                    <ProgressBar 
                                        progress={(currentItem.progressPercent || 0) / 100} 
                                        color={statusIdleColors.text} 
                                        style={styles.progressBar} 
                                    />
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.heroContentZen}>
                            <View style={[styles.iconCircle, { backgroundColor: statusIdleColors.iconBackground }]}>
                                <ShieldCheck size={32} color={statusIdleColors.text} />
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={[styles.heroTitle, {color: statusIdleColors.text}]}>System Ready</Text>
                                <Text style={[styles.heroSubtitle, {color: statusIdleColors.text}]}>
                                    Secure Offline Mode active.
                                </Text>
                            </View>
                        </View>
                    )}
                </Surface>

                <Text style={[styles.sectionTitle, {color: theme.colors.onBackground}]}>Queue ({queueItems.length})</Text>

                <View style={styles.listContainer}>
                    {queueItems.length === 0 ? (
                        <View style={styles.emptyState}>
                            <FileText size={48} color={theme.colors.outlineVariant} />
                            <Text style={[styles.emptyText, {color: theme.colors.onSurfaceVariant}]}>No recent sessions</Text>
                        </View>
                    ) : (
                        queueItems.map((item, index) => {
                            const config = getStatusConfig(item.status);
                            const StatusIcon = config.icon;

                            return (
                                <TouchableOpacity 
                                    key={item.id} 
                                    activeOpacity={0.7}
                                    onPress={() => console.log('Open', item.id)}
                                >
                                    <Surface style={[
                                        styles.itemCard,
                                        {
                                            backgroundColor: theme.colors.surface,
                                            shadowColor: theme.colors.primary,
                                        },
                                    ]}>
                                        <View style={styles.itemRow}>
                                            <View style={[styles.statusBubble, { backgroundColor: config.background }]}>
                                                <StatusIcon size={20} color={config.color} />
                                            </View>

                                            <View style={styles.itemInfo}>
                                                <Text style={[styles.itemTitle, {color: theme.colors.onSurface}]} numberOfLines={1}>
                                                    Subject-{item.encounterUuid.slice(0, 6)}
                                                </Text>
                                                <View style={styles.itemMetaRow}>
                                                    <Text style={[styles.itemStatus, { color: config.color }]}>
                                                        {config.label}
                                                    </Text>
                                                    <Text style={[styles.dot, {color: theme.colors.outlineVariant}]}>•</Text>
                                                    <Text style={[styles.itemDate, {color: theme.colors.onSurfaceVariant}]}>
                                                        {dayjs(item.createdAt).fromNow()}
                                                    </Text>
                                                </View>
                                            </View>

                                            <ChevronRight size={20} color={theme.colors.outlineVariant} />
                                        </View>
                                        
                                        {item.status === QueueItemStatus.PROCESSING && (
                                            <ProgressBar 
                                                progress={(item.progressPercent || 0) / 100} 
                                                color={config.color} 
                                                style={styles.miniProgress} 
                                            />
                                        )}
                                    </Surface>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>

                <View style={{ height: 100 }} /> 
            </ScrollView>

            <FAB
                icon="microphone" 
                label="New Session"
                onPress={handleStartSession}
                style={[
                    styles.fab,
                    {
                        backgroundColor: statusIdleColors.text,
                        shadowColor: statusIdleColors.shadowColor,
                    },
                ]}
                color="#FFFFFF"
                mode="elevated"
                uppercase={false}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    heroCard: {
        borderRadius: 32,
        padding: 24,
        marginBottom: 32,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 6,
    },
    heroWatermark: {
        position: 'absolute',
        right: -20,
        bottom: -30,
        zIndex: 0,
    },
    heroContentZen: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    heroSubtitle: {
        fontSize: 15,
        opacity: 0.8,
        marginTop: 4,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1,
    },
    badgeProcessing: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 8,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    heroTime: {
        fontWeight: 'bold',
        opacity: 0.6,
    },
    progressContainer: {
        marginTop: 20,
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
        marginLeft: 4,
    },
    listContainer: {
        gap: 12,
    },
    itemCard: {
        borderRadius: 24,
        padding: 16,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    statusBubble: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemInfo: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    itemMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemStatus: {
        fontSize: 13,
        fontWeight: '600',
    },
    dot: {
        marginHorizontal: 6,
    },
    itemDate: {
        fontSize: 13,
    },
    miniProgress: {
        height: 2,
        borderRadius: 1,
        marginTop: 12,
        opacity: 0.5,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        opacity: 0.5,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        borderRadius: 30,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
});