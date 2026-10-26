import { observer } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { FileAudio, FolderOpen, Lock, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
    ActivityIndicator,
    Button,
    Card,
    IconButton,
    List,
    Snackbar,
    Surface,
    Text,
    TextInput,
    useTheme,
} from 'react-native-paper';
import { Container } from '@/Core/Container';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { DevAudioState } from './DevAudioState';

export const DevAudioScreen = observer((): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();
    const router = useRouter();
    const [state] = React.useState(() => Container.get(DevAudioState));
    const [inputPath, setInputPath] = React.useState('');

    const isLoading = state.state$.isLoading.get();
    const files = state.state$.files.get();
    const notification = state.state$.notification.get();

    const renderFileItem = ({ item }: { item: (typeof files)[0] }) => (
        <List.Item
            title={item.name}
            description={`${item.sizeBytes} bytes`}
            left={(props) => <List.Icon {...props} icon={() => <FileAudio size={24} color={theme.colors.primary} />} />}
            right={(props) =>
                item.isEncrypted ? (
                    <View style={STYLES.row} {...props}>
                        <Lock size={20} color={theme.colors.primary} />
                        <Text variant="labelSmall" style={{ color: theme.colors.primary, marginLeft: 4 }}>
                            Encrypted
                        </Text>
                    </View>
                ) : (
                    <Button
                        mode="contained-tonal"
                        compact
                        onPress={() => state.encryptFile(item.path)}
                        disabled={isLoading}
                    >
                        Encrypt
                    </Button>
                )
            }
        />
    );

    return (
        <View style={[STYLES.container, { backgroundColor: theme.colors.background }]}>
            <Surface style={STYLES.header} elevation={1}>
                <View style={STYLES.headerRow}>
                    <IconButton icon="arrow-left" onPress={() => router.back()} />
                    <Text variant="titleLarge" style={STYLES.headerTitle}>
                        Dev Audio Encryptor
                    </Text>
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Convert raw audio files into app-compatible encrypted format
                </Text>
            </Surface>

            <View style={STYLES.content}>
                <Card style={STYLES.inputCard}>
                    <Card.Content>
                        <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                            Source Directory
                        </Text>
                        <TextInput
                            mode="outlined"
                            placeholder="/path/to/audio/files"
                            value={inputPath}
                            onChangeText={setInputPath}
                            right={
                                <TextInput.Icon
                                    icon={() => <FolderOpen size={20} color={theme.colors.onSurfaceVariant} />}
                                    onPress={() => state.scanDirectory(inputPath)}
                                />
                            }
                        />
                        <View style={STYLES.buttonRow}>
                            <Button
                                mode="contained"
                                onPress={() => state.scanDirectory(inputPath)}
                                loading={isLoading}
                                disabled={isLoading || inputPath.length === 0}
                                icon={() => <RefreshCw size={18} color={theme.colors.onPrimary} />}
                            >
                                Scan
                            </Button>
                            {files.length > 0 && (
                                <Button
                                    mode="outlined"
                                    onPress={() => state.encryptAll()}
                                    loading={isLoading}
                                    disabled={isLoading}
                                >
                                    Encrypt All
                                </Button>
                            )}
                        </View>
                    </Card.Content>
                </Card>

                {files.length > 0 && (
                    <Card style={STYLES.filesCard}>
                        <Card.Content>
                            <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                                Audio Files ({files.length})
                            </Text>
                            <FlatList
                                data={files}
                                keyExtractor={(item) => item.path}
                                renderItem={renderFileItem}
                                scrollEnabled={false}
                            />
                        </Card.Content>
                    </Card>
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
            </View>

            <Snackbar
                visible={notification != null}
                onDismiss={() => state.dismissNotification()}
                duration={3000}
                action={{ label: 'Dismiss', onPress: () => state.dismissNotification() }}
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
    inputCard: {
        marginBottom: 16,
    },
    filesCard: {
        flex: 1,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    emptyState: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        marginTop: 32,
    },
    row: {
        alignItems: 'center',
        flexDirection: 'row',
    },
});
