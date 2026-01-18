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
    FAB,
    ProgressBar,
} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {observer} from '@legendapp/state/react';
import {useAudioRecording} from '@Recording/useAudioRecording';
import {
    CheckCircle2,
    Loader2,
    Clock,
    FileText,
    ChevronRight,
} from 'lucide-react-native';
import {StatusReady, StatusProcessing} from '@/Components';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/en';
import {useQueueStore} from '@/Store/useQueueStore';
import {database} from '@/Service/Database';
import {QueueItem} from '@/Model/QueueItem';
import {QueueItemStatus, PipelineStage} from '@/Model/Type';
import {Q} from '@nozbe/watermelondb';

dayjs.extend(relativeTime);

export const Home = observer((): React.JSX.Element => {
    const theme = useTheme();
    const navigation = useNavigation();
    const [refreshing, setRefreshing] = useState(false);
    const [queueItems, setQueueItems] = useState<QueueItem[]>([]);

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
            const queueCollection = database.collections.get<QueueItem>('queue_items');
            const items = await queueCollection
                .query(Q.sortBy('created_at', Q.desc), Q.take(20))
                .fetch();
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
                return { icon: Loader2, color: '#F59E0B', label: 'Processing', bg: '#FEF3C7' };
            case QueueItemStatus.COMPLETED:
                return { icon: CheckCircle2, color: '#10B981', label: 'Completed', bg: '#D1FAE5' };
            case QueueItemStatus.FAILED:
                return { icon: FileText, color: '#EF4444', label: 'Error', bg: '#FEE2E2' };
            default:
                return { icon: Clock, color: '#64748B', label: 'Pending', bg: '#F1F5F9' };
        }
    };

    return (
        <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={(theme.colors as any).statusIdle.text} />
                }
            >
                {isProcessing ? (
                    <StatusProcessing
                        progress={currentItem?.progressPercent}
                        currentTask={currentItem ? `${currentItem.pipelineStage || 'Initialization'}` : 'Preparing...'}
                        timeEstimate="~ 4 min"
                    />
                ) : (
                    <StatusReady />
                )}

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
                                            <View style={[styles.statusBubble, { backgroundColor: config.bg }]}>
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
                        backgroundColor: (theme.colors as any).statusIdle.text,
                        shadowColor: (theme.colors as any).statusIdle.shadowColor,
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