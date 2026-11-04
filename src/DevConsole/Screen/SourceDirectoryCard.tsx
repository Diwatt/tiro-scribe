import { FolderOpen, RefreshCw } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import { ThemedIcon } from '@/Components';

const FolderOpenFieldIcon = ThemedIcon.create({ icon: FolderOpen, size: 20, colorToken: 'onSurfaceVariant' });
const RefreshCwButtonIcon = ThemedIcon.create({ icon: RefreshCw, size: 18, colorToken: 'onPrimary' });

interface Props {
    readonly directory: string;
    readonly isLoading: boolean;
    readonly hasFiles: boolean;
    readonly onDirectoryChange: (directory: string) => void;
    readonly onScan: () => void;
    readonly onEncryptAll: () => void;
}

export const SourceDirectoryCard = ({
    directory,
    isLoading,
    hasFiles,
    onDirectoryChange,
    onScan,
    onEncryptAll,
}: Props): React.JSX.Element => {
    return (
        <Card style={STYLES.card}>
            <Card.Content>
                <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                    Source Directory
                </Text>
                <TextInput
                    mode="outlined"
                    placeholder="/path/to/audio/files"
                    value={directory}
                    onChangeText={onDirectoryChange}
                    right={<TextInput.Icon icon={FolderOpenFieldIcon} onPress={onScan} />}
                />
                <View style={STYLES.buttonRow}>
                    <Button
                        mode="contained"
                        onPress={onScan}
                        loading={isLoading}
                        disabled={isLoading || directory.length === 0}
                        icon={RefreshCwButtonIcon}
                    >
                        Scan
                    </Button>
                    {hasFiles ? (
                        <Button mode="outlined" onPress={onEncryptAll} loading={isLoading} disabled={isLoading}>
                            Encrypt All
                        </Button>
                    ) : null}
                </View>
            </Card.Content>
        </Card>
    );
};

const STYLES = StyleSheet.create({
    card: {
        marginBottom: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
});
