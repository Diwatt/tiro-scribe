import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GroupedList, LargeTitle, ListRow, NavigationBar, Panel, ScreenFrame, SectionLabel } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import type { StorageShare } from '@/Screen/Model';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    totalLabel: string;
    shares: ReadonlyArray<StorageShare>;
    language: string;
    transcriptionModel: string;
    transcriptionSize: string;
    summaryModel: string;
    summarySize: string;
    voiceModels: string;
    voiceSize: string;
    onBack?: () => void;
    onLanguage?: () => void;
}

/** Storage usage bar and installed on-device models. */
export function StoragePageScreen(props: Props): React.JSX.Element {
    const { LL } = useLocalization();

    return (
        <ScreenFrame>
            <NavigationBar backLabel={LL.settingsHome.title()} onBack={props.onBack} />
            <LargeTitle title={LL.settingsHome.storage()} />
            <Panel>
                <View style={STYLES.total}>
                    <Text style={STYLES.totalValue}>{props.totalLabel}</Text>
                    <Text style={STYLES.muted}>{LL.storagePage.used()}</Text>
                </View>
                <View style={STYLES.bar}>
                    {props.shares.map((share) => (
                        <View key={share.label} style={{ flex: share.megabytes, backgroundColor: share.color }} />
                    ))}
                </View>
                {props.shares.map((share) => (
                    <View key={share.label} style={STYLES.legend}>
                        <View style={[STYLES.swatch, { backgroundColor: share.color }]} />
                        <Text style={STYLES.legendLabel}>{share.label}</Text>
                        <Text style={STYLES.muted}>{share.size}</Text>
                    </View>
                ))}
            </Panel>
            <SectionLabel label={LL.storagePage.installed()} />
            <GroupedList>
                <ListRow title={LL.storagePage.language()} value={props.language} onPress={props.onLanguage} />
                <ListRow title={LL.storagePage.transcription()} detail={props.transcriptionModel} value={props.transcriptionSize} />
                <ListRow title={LL.storagePage.summary()} detail={props.summaryModel} value={props.summarySize} />
                <ListRow title={LL.storagePage.voice()} detail={props.voiceModels} value={props.voiceSize} />
            </GroupedList>
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
    legend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendLabel: { flex: 1, fontSize: 14, color: PaperInk.TEXT },
    muted: { fontSize: 13, color: PaperInk.TEXT_MUTED },
    swatch: { width: 10, height: 10, borderRadius: 3 },
    total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    totalValue: { fontSize: 26, fontWeight: '700', color: PaperInk.TEXT },
});
