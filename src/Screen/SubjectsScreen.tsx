import { User } from 'lucide-react-native';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Avatar, Card, Searchbar, Text, useTheme } from 'react-native-paper';
import { useAppLanguage } from '@/Localization';
import type { ExtendedTheme } from '@/theme/AppTheme';

// Mock data for subjects (uuid for offline/sync)
const mockSubjects = [
    { uuid: '1', biocode: 'SUBJ-****-A3F2', lastEncounter: '2 hours ago' },
    { uuid: '2', biocode: 'SUBJ-****-B7C1', lastEncounter: '1 day ago' },
    { uuid: '3', biocode: 'SUBJ-****-D9E4', lastEncounter: '3 days ago' },
    { uuid: '4', biocode: 'SUBJ-****-E5F6', lastEncounter: '1 week ago' },
];

export function SubjectsScreen(): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const { LL } = useAppLanguage();
    const [searchQuery, setSearchQuery] = React.useState('');
    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Searchbar placeholder={LL.subjects.searchPlaceholder()} onChangeText={setSearchQuery} value={searchQuery} style={styles.searchbar} />
            <FlatList
                data={mockSubjects}
                keyExtractor={(item) => ('primaryKey' in item ? (item as { primaryKey: string }).primaryKey : (item as { uuid: string }).uuid)}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <Card style={[styles.subjectCard, { backgroundColor: theme.colors.surface }]} mode="outlined">
                        <Card.Content style={styles.cardContent}>
                            <Avatar.Icon size={40} icon={User} style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]} />
                            <View style={styles.subjectInfo}>
                                <Text variant="titleMedium" style={[styles.biocode, { color: theme.colors.onSurface }]}>
                                    {Array.isArray(item.biocode) ? JSON.stringify(item.biocode) : item.biocode}
                                </Text>
                                <Text variant="bodySmall" style={[styles.lastEncounter, { color: theme.colors.onSurfaceVariant }]}>
                                    {LL.subjects.lastEncounter()} {item.lastEncounter}
                                </Text>
                            </View>
                        </Card.Content>
                    </Card>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchbar: {
        margin: 16,
    },
    listContent: {
        padding: 16,
        paddingTop: 0,
    },
    subjectCard: {
        marginBottom: 12,
        elevation: 0,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    avatar: {
        marginRight: 16,
    },
    subjectInfo: {
        flex: 1,
    },
    biocode: {
        fontWeight: '600',
        marginBottom: 4,
    },
    lastEncounter: {
        opacity: 0.7,
    },
});
