/**
 * Settings Screen
 * App configuration & Profile
 */

import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {
    Text,
    useTheme,
    List,
    Switch,
    Divider,
    Surface,
} from 'react-native-paper';
import {Settings, User, Shield, Bell, Moon} from 'lucide-react-native';

interface SettingsScreenProps {
    // No props needed for this screen
}

export function SettingsScreen(props: SettingsScreenProps): React.JSX.Element {
    const theme = useTheme();
    const [notificationsEnabled, setNotificationsEnabled] =
        React.useState(true);
    const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);
    return (
        <ScrollView
            style={[
                styles.container,
                {backgroundColor: theme.colors.background},
            ]}>
            <Surface
                style={[
                    styles.section,
                    {backgroundColor: theme.colors.surface},
                ]}>
                <List.Section>
                    <List.Subheader>Profile</List.Subheader>
                    <List.Item
                        title="Therapist Profile"
                        description="Manage your profile information"
                        left={(props) => (
                            <List.Icon {...props} icon={User} />
                        )}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                    />
                </List.Section>
            </Surface>

            <Surface
                style={[
                    styles.section,
                    {backgroundColor: theme.colors.surface},
                ]}>
                <List.Section>
                    <List.Subheader>Privacy & Security</List.Subheader>
                    <List.Item
                        title="Privacy Settings"
                        description="Configure data protection"
                        left={(props) => (
                            <List.Icon {...props} icon={Shield} />
                        )}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                    />
                </List.Section>
            </Surface>

            <Surface
                style={[
                    styles.section,
                    {backgroundColor: theme.colors.surface},
                ]}>
                <List.Section>
                    <List.Subheader>Preferences</List.Subheader>
                    <List.Item
                        title="Notifications"
                        description="Enable push notifications"
                        left={(props) => (
                            <List.Icon {...props} icon={Bell} />
                        )}
                        right={() => (
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                            />
                        )}
                    />
                    <Divider />
                    <List.Item
                        title="Dark Mode"
                        description="Use dark theme"
                        left={(props) => (
                            <List.Icon {...props} icon={Moon} />
                        )}
                        right={() => (
                            <Switch
                                value={darkModeEnabled}
                                onValueChange={setDarkModeEnabled}
                            />
                        )}
                    />
                </List.Section>
            </Surface>

            <Surface
                style={[
                    styles.section,
                    {backgroundColor: theme.colors.surface},
                ]}>
                <List.Section>
                    <List.Subheader>About</List.Subheader>
                    <List.Item
                        title="Version"
                        description="1.0.0"
                        left={(props) => (
                            <List.Icon {...props} icon={Settings} />
                        )}
                    />
                </List.Section>
            </Surface>
        </ScrollView>
    );
};

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
