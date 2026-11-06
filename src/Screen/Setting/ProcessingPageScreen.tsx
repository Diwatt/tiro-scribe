import { Check } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text } from 'react-native';
import { GroupedList, LargeTitle, ListRow, NavigationBar, ScreenFrame, SectionLabel, SwitchRow } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { PaperInk } from '@/theme/PaperInk';
import { TranscriptionTiming } from './TranscriptionTiming';

interface Props {
    timing: TranscriptionTiming;
    isSummaryPrepared: boolean;
    isNotifying: boolean;
    onBack?: () => void;
    onTimingChange?: (timing: TranscriptionTiming) => void;
    onSummaryChange?: (isOn: boolean) => void;
    onNotifyChange?: (isOn: boolean) => void;
}

/** Processing settings: when to transcribe, what to do afterwards. */
export function ProcessingPageScreen(props: Props): React.JSX.Element {
    const { LL } = useLocalization();
    const options = [
        [TranscriptionTiming.Charging, LL.processingPage.charging(), LL.processingPage.chargingDetail()],
        [TranscriptionTiming.ChargingAtNight, LL.processingPage.night(), LL.processingPage.nightDetail()],
        [TranscriptionTiming.AsSoonAsPossible, LL.processingPage.asap(), LL.processingPage.asapDetail()],
    ] as const;

    return (
        <ScreenFrame>
            <NavigationBar backLabel={LL.settingsHome.title()} onBack={props.onBack} />
            <LargeTitle title={LL.settingsHome.processing()} />
            <SectionLabel label={LL.processingPage.when()} />
            <GroupedList>
                {options.map(([timing, title, detail]) => (
                    <ListRow
                        key={timing}
                        title={title}
                        detail={detail}
                        trailing={
                            timing === props.timing ? <Check size={20} color={PaperInk.ACCENT} strokeWidth={2.8} /> : <></>
                        }
                        onPress={() => props.onTimingChange?.(timing)}
                    />
                ))}
            </GroupedList>
            <SectionLabel label={LL.processingPage.after()} />
            <GroupedList>
                <SwitchRow
                    title={LL.processingPage.prepare()}
                    detail={LL.processingPage.prepareDetail()}
                    isOn={props.isSummaryPrepared}
                    onChange={props.onSummaryChange}
                />
                <SwitchRow
                    title={LL.processingPage.notify()}
                    detail={LL.processingPage.notifyDetail()}
                    isOn={props.isNotifying}
                    onChange={props.onNotifyChange}
                />
            </GroupedList>
            <Text style={STYLES.footnote}>{LL.processingPage.footnote()}</Text>
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    footnote: { fontSize: 13, lineHeight: 18, color: PaperInk.TEXT_MUTED, paddingHorizontal: 8 },
});
