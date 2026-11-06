import { Share } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GroupedList, PillButton, SectionLabel, SegmentedControl, SwitchRow } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';
import { TypeScale } from '@/theme/TypeScale';

interface Props {
    isPdf: boolean;
    hasTranscript: boolean;
    hasSummary: boolean;
    hasNotes: boolean;
    isMaskingNames: boolean;
    onFormatChange?: (isPdf: boolean) => void;
    onTranscriptChange?: (isOn: boolean) => void;
    onSummaryChange?: (isOn: boolean) => void;
    onNotesChange?: (isOn: boolean) => void;
    onMaskNamesChange?: (isOn: boolean) => void;
    onShare?: () => void;
}

/** Export bottom sheet: format, content to include, name masking, system share. */
export function ExportSheet(props: Props): React.JSX.Element {
    const { LL } = useLocalization();
    const insets = useSafeAreaInsets();

    return (
        <View style={STYLES.backdrop}>
            <View style={[STYLES.sheet, { paddingBottom: insets.bottom + 20 }]}>
                <View style={STYLES.grabber} />
                <Text style={TypeScale.TITLE_SMALL}>{LL.exportSheet.title()}</Text>
                <SectionLabel label={LL.exportSheet.format()} />
                <SegmentedControl
                    label={LL.exportSheet.format()}
                    options={[LL.exportSheet.pdf(), LL.exportSheet.text()]}
                    selectedIndex={props.isPdf ? 0 : 1}
                    onChange={(index) => props.onFormatChange?.(index === 0)}
                />
                <SectionLabel label={LL.exportSheet.content()} />
                <GroupedList>
                    <SwitchRow title={LL.exportSheet.transcript()} isOn={props.hasTranscript} onChange={props.onTranscriptChange} />
                    <SwitchRow title={LL.exportSheet.summary()} isOn={props.hasSummary} onChange={props.onSummaryChange} />
                    <SwitchRow title={LL.exportSheet.notes()} isOn={props.hasNotes} onChange={props.onNotesChange} />
                </GroupedList>
                <GroupedList>
                    <SwitchRow
                        title={LL.exportSheet.maskNames()}
                        detail={LL.exportSheet.maskNamesDetail()}
                        isOn={props.isMaskingNames}
                        onChange={props.onMaskNamesChange}
                    />
                </GroupedList>
                <PillButton label={LL.exportSheet.share()} icon={Share} onPress={props.onShare} />
                <Text style={[TypeScale.CAPTION, STYLES.centered]}>{LL.exportSheet.footnote()}</Text>
            </View>
        </View>
    );
}

const STYLES = StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: PaperInk.SCRIM },
    centered: { textAlign: 'center' },
    grabber: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: PaperInk.LINE_STRONG },
    sheet: {
        gap: 12,
        paddingHorizontal: Metric.GUTTER,
        paddingTop: 10,
        borderTopLeftRadius: Metric.RADIUS_SHEET,
        borderTopRightRadius: Metric.RADIUS_SHEET,
        backgroundColor: PaperInk.PAPER,
    },
});
