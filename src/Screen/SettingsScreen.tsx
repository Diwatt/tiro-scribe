import { useNavigation } from '@react-navigation/native';
import { Bell, Moon, Settings, Shield, User } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Divider, List, Surface, Switch, useTheme } from 'react-native-paper';
import type { RootTabScreenProps } from '@/Navigation/types';
import { useLocalization } from '@/Localization';
import type { ExtendedTheme } from '@/theme/AppTheme';

export function SettingsScreen(): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const { LL } = useLocalization();
    const navigation = useNavigation<RootTabScreenProps<'Settings'>['navigation']>();
    const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
    const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);
    const [devTapCount, setDevTapCount] = React.useState(0);
    const [showDevTrigger, setShowDevTrigger] = React.useState(false);
    return (
        <ScrollView style={[STYLES.container, { backgroundColor: theme.colors.background }]}>
            <Surface style={[STYLES.section, { backgroundColor: theme.colors.surface }]}>
                <List.Section>
                    <List.Subheader>{LL.settings.profile()}</List.Subheader>
                    <List.Item
                        title={LL.settings.therapistProfile()}
                        description={LL.settings.therapistProfileDesc()}
                        left={(p) => <List.Icon {...p} icon={User} />}
                        right={(p) => <List.Icon {...p} icon="chevron-right" />}
                    />
                </List.Section>
            </Surface>

            <Surface style={[STYLES.section, { backgroundColor: theme.colors.surface }]}>
                <List.Section>
                    <List.Subheader>{LL.settings.privacySecurity()}</List.Subheader>
                    <List.Item
                        title={LL.settings.privacySettings()}
                        description={LL.settings.privacySettingsDesc()}
                        left={(p) => <List.Icon {...p} icon={Shield} />}
                        right={(p) => <List.Icon {...p} icon="chevron-right" />}
                    />
                </List.Section>
            </Surface>

            <Surface style={[STYLES.section, { backgroundColor: theme.colors.surface }]}>
                <List.Section>
                    <List.Subheader>{LL.settings.preferences()}</List.Subheader>
                    <List.Item
                        title={LL.settings.notifications()}
                        description={LL.settings.notificationsDesc()}
                        left={(p) => <List.Icon {...p} icon={Bell} />}
                        right={() => <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />}
                    />
                    <Divider />
                    <List.Item
                        title={LL.settings.darkMode()}
                        description={LL.settings.darkModeDesc()}
                        left={(p) => <List.Icon {...p} icon={Moon} />}
                        right={() => <Switch value={darkModeEnabled} onValueChange={setDarkModeEnabled} />}
                    />
                </List.Section>
            </Surface>

            <Surface style={[STYLES.section, { backgroundColor: theme.colors.surface }]}>
                <List.Section>
                    <List.Subheader>{LL.settings.about()}</List.Subheader>
                    <List.Item
                        title={LL.settings.version()}
                        description="1.0.0"
                        left={(p) => <List.Icon {...p} icon={Settings} />}
                        onPress={() => {
                            const nextCount = devTapCount + 1;
                            setDevTapCount(nextCount);
                            if (nextCount >= 5) {
                                setShowDevTrigger(true);
                                setDevTapCount(0);
                            }
                        }}
                    />
                    {showDevTrigger && (
                        <List.Item
                            title="Dev Audio Encryptor"
                            description="Convert raw audio to encrypted .dat files"
                            left={(p) => <List.Icon {...p} icon={Settings} />}
                            onPress={() => {
                                setShowDevTrigger(false);
                                navigation.navigate('DevSeed');
                            }}
                        />
                    )}
                </List.Section>
            </Surface>
        </ScrollView>
    );
}

const STYLES = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        margin: 16,
        marginBottom: 0,
        borderRadius: 12,
        elevation: 1,
    },
});
