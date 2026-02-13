import { Bell, Moon, Settings, Shield, User } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Divider, List, Surface, Switch, useTheme } from 'react-native-paper';
import { useAppLanguage } from '@/Localization';
import type { ExtendedTheme } from '@/theme/AppTheme';

export function SettingsScreen(): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const { LL } = useAppLanguage();
    const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
    const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);
    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                <List.Section>
                    <List.Subheader>{LL.settingsProfile()}</List.Subheader>
                    <List.Item
                        title={LL.settingsTherapistProfile()}
                        description={LL.settingsTherapistProfileDesc()}
                        left={(p) => <List.Icon {...p} icon={User} />}
                        right={(p) => <List.Icon {...p} icon="chevron-right" />}
                    />
                </List.Section>
            </Surface>

            <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                <List.Section>
                    <List.Subheader>{LL.settingsPrivacySecurity()}</List.Subheader>
                    <List.Item
                        title={LL.settingsPrivacySettings()}
                        description={LL.settingsPrivacySettingsDesc()}
                        left={(p) => <List.Icon {...p} icon={Shield} />}
                        right={(p) => <List.Icon {...p} icon="chevron-right" />}
                    />
                </List.Section>
            </Surface>

            <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                <List.Section>
                    <List.Subheader>{LL.settingsPreferences()}</List.Subheader>
                    <List.Item
                        title={LL.settingsNotifications()}
                        description={LL.settingsNotificationsDesc()}
                        left={(p) => <List.Icon {...p} icon={Bell} />}
                        right={() => <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />}
                    />
                    <Divider />
                    <List.Item
                        title={LL.settingsDarkMode()}
                        description={LL.settingsDarkModeDesc()}
                        left={(p) => <List.Icon {...p} icon={Moon} />}
                        right={() => <Switch value={darkModeEnabled} onValueChange={setDarkModeEnabled} />}
                    />
                </List.Section>
            </Surface>

            <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                <List.Section>
                    <List.Subheader>{LL.settingsAbout()}</List.Subheader>
                    <List.Item title={LL.settingsVersion()} description="1.0.0" left={(p) => <List.Icon {...p} icon={Settings} />} />
                </List.Section>
            </Surface>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
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
