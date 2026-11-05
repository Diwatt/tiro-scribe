import { FileAudio, UserRound } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import { ThemedIcon } from '@/Components';
import type { ExtendedTheme } from '@/theme/AppTheme';

const FileAudioFieldIcon = ThemedIcon.create({ icon: FileAudio, size: 20, colorToken: 'onSurfaceVariant' });
const UserRoundButtonIcon = ThemedIcon.create({ icon: UserRound, size: 18, colorToken: 'onPrimary' });

interface Props {
    readonly sourcePath: string;
    readonly segmentStart: string;
    readonly segmentEnd: string;
    readonly firstUnencryptedPath: string;
    readonly isFormValid: boolean;
    readonly isLoading: boolean;
    readonly onSourcePathChange: (path: string) => void;
    readonly onPickSource: () => void;
    readonly onSegmentStartChange: (raw: string) => void;
    readonly onSegmentEndChange: (raw: string) => void;
    readonly onCreate: () => void;
}

export const TherapistOnboardingCard = ({
    sourcePath,
    segmentStart,
    segmentEnd,
    firstUnencryptedPath,
    isFormValid,
    isLoading,
    onSourcePathChange,
    onPickSource,
    onSegmentStartChange,
    onSegmentEndChange,
    onCreate,
}: Props): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();

    return (
        <Card>
            <Card.Content>
                <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                    Dev Therapist Onboarding
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                    Creates the dev therapist with a biocode from a voice-only segment of the source audio
                </Text>
                <TextInput
                    mode="outlined"
                    placeholder="Source audio path"
                    value={sourcePath}
                    onChangeText={onSourcePathChange}
                    right={
                        firstUnencryptedPath.length > 0 ? (
                            <TextInput.Icon icon={FileAudioFieldIcon} onPress={onPickSource} />
                        ) : undefined
                    }
                />
                <View style={STYLES.segmentRow}>
                    <TextInput
                        mode="outlined"
                        label="Start (ms)"
                        keyboardType="numeric"
                        value={segmentStart}
                        onChangeText={onSegmentStartChange}
                        style={STYLES.segmentInput}
                    />
                    <TextInput
                        mode="outlined"
                        label="End (ms)"
                        keyboardType="numeric"
                        value={segmentEnd}
                        onChangeText={onSegmentEndChange}
                        style={STYLES.segmentInput}
                    />
                </View>
                <Button
                    mode="contained"
                    onPress={onCreate}
                    loading={isLoading}
                    disabled={isLoading || !isFormValid}
                    icon={UserRoundButtonIcon}
                >
                    Create Dev Therapist
                </Button>
            </Card.Content>
        </Card>
    );
};

const STYLES = StyleSheet.create({
    segmentInput: {
        flex: 1,
    },
    segmentRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
});
