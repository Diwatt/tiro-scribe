import { Database, Info, Lock, Mic, User, Zap } from 'lucide-react-native';
import type React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GroupedList, IconTile, LargeTitle, ListRow, ScreenFrame } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';
import { Tone } from '@/theme/Tone';

interface Props {
    initials: string;
    profileDetail: string;
    securityValue: string;
    storageValue: string;
    processingValue: string;
    version: string;
    onProfile?: () => void;
    onSecurity?: () => void;
    onStorage?: () => void;
    onProcessing?: () => void;
    onVoice?: () => void;
    onAbout?: () => void;
}

/** Settings tab: profile card then grouped entries. */
export function SettingsHomeScreen(props: Props): React.JSX.Element {
    const { LL } = useLocalization();

    return (
        <ScreenFrame hasTabBar>
            <LargeTitle title={LL.settingsHome.title()} />
            <Pressable onPress={props.onProfile} accessibilityRole="button" style={STYLES.profile}>
                {props.initials ? (
                    <Text style={STYLES.initials}>{props.initials}</Text>
                ) : (
                    <IconTile icon={User} size={52} isRound />
                )}
                <View style={STYLES.flex}>
                    <Text style={STYLES.profileTitle}>{LL.settingsHome.profile()}</Text>
                    <Text style={STYLES.profileDetail}>{props.profileDetail}</Text>
                </View>
            </Pressable>
            <GroupedList>
                <ListRow
                    title={LL.settingsHome.security()}
                    value={props.securityValue}
                    leading={<IconTile icon={Lock} />}
                    onPress={props.onSecurity}
                />
                <ListRow
                    title={LL.settingsHome.storage()}
                    value={props.storageValue}
                    leading={<IconTile icon={Database} tone={Tone.Accent} />}
                    onPress={props.onStorage}
                />
                <ListRow
                    title={LL.settingsHome.processing()}
                    value={props.processingValue}
                    leading={<IconTile icon={Zap} tone={Tone.Ochre} />}
                    onPress={props.onProcessing}
                />
                <ListRow title={LL.settingsHome.voice()} leading={<IconTile icon={Mic} />} onPress={props.onVoice} />
                <ListRow title={LL.settingsHome.about()} leading={<IconTile icon={Info} />} onPress={props.onAbout} />
            </GroupedList>
            <Text style={STYLES.footer}>{LL.settingsHome.footer({ version: props.version })}</Text>
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    flex: { flex: 1, gap: 2 },
    footer: { fontSize: 13, lineHeight: 18, color: PaperInk.TEXT_MUTED, paddingHorizontal: 8 },
    initials: {
        width: 52,
        height: 52,
        borderRadius: 26,
        overflow: 'hidden',
        backgroundColor: PaperInk.INK,
        color: PaperInk.PAPER,
        fontSize: 19,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 52,
    },
    profile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 14,
        borderRadius: Metric.RADIUS_CARD,
        borderWidth: 1,
        borderColor: PaperInk.LINE,
        backgroundColor: PaperInk.CARD,
    },
    profileDetail: { fontSize: 13, color: PaperInk.TEXT_MUTED },
    profileTitle: { fontSize: 17, fontWeight: '600', color: PaperInk.TEXT },
});
