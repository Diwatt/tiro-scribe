import { FileAudio, Lock } from 'lucide-react-native';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Card, List, Text, useTheme } from 'react-native-paper';
import { ThemedIcon } from '@/Components';
import type { ExtendedTheme } from '@/theme/AppTheme';
import type { AudioFileEntry } from '../Data/AudioFileEntry';

type ListItemIconProps = Parameters<NonNullable<React.ComponentProps<typeof List.Item>['left']>>[0];
type ListItemActionProps = Parameters<NonNullable<React.ComponentProps<typeof List.Item>['right']>>[0];

const FileAudioListItemIcon = ThemedIcon.create({ icon: FileAudio, size: 24, colorToken: 'primary' });

interface Props {
    readonly files: readonly AudioFileEntry[];
    readonly isLoading: boolean;
    readonly onLoadFixture: (encryptedPath: string, durationMs: number) => void;
    readonly onEncryptFile: (filePath: string) => void;
}

export const AudioFilesCard = ({ files, isLoading, onLoadFixture, onEncryptFile }: Props): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();

    const handleFileKey = React.useCallback((file: AudioFileEntry): string => file.path, []);

    const renderFileItem = ({ item }: { item: AudioFileEntry }) => {
        const handleLoadFixture = (): void => {
            onLoadFixture(item.encryptedPath ?? '', item.durationMs ?? 0);
        };
        const handleEncryptFile = (): void => {
            onEncryptFile(item.path);
        };
        const renderListItemIcon = (props: ListItemIconProps): React.JSX.Element => (
            <List.Icon {...props} icon={FileAudioListItemIcon} />
        );
        const renderItemActions = (props: ListItemActionProps): React.JSX.Element =>
            item.isEncrypted ? (
                <View {...props} style={[STYLES.row, props.style]}>
                    <Button
                        mode="contained-tonal"
                        compact
                        onPress={handleLoadFixture}
                        disabled={isLoading || item.durationMs == null}
                    >
                        Load
                    </Button>
                    <Lock size={20} color={theme.colors.primary} />
                </View>
            ) : (
                <Button mode="contained-tonal" compact onPress={handleEncryptFile} disabled={isLoading}>
                    Encrypt
                </Button>
            );

        return (
            <List.Item
                title={item.name}
                description={`${item.sizeBytes} bytes`}
                left={renderListItemIcon}
                right={renderItemActions}
            />
        );
    };

    return (
        <Card style={STYLES.card}>
            <Card.Content>
                <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                    Audio Files ({files.length})
                </Text>
                <FlatList data={files} keyExtractor={handleFileKey} renderItem={renderFileItem} scrollEnabled={false} />
            </Card.Content>
        </Card>
    );
};

const STYLES = StyleSheet.create({
    card: {
        flex: 1,
    },
    row: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
        paddingRight: 8,
    },
});
