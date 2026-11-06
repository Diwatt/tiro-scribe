import { Check, X } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GroupedList, LargeTitle, ListRow, ScreenFrame, SectionLabel } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import type { DeviceRequirement } from '@/Screen/Model';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    requirements: ReadonlyArray<DeviceRequirement>;
    recommendedDevices: ReadonlyArray<string>;
}

/** Explains which hardware requirement blocks on-device transcription. */
export function IncompatibleScreen({ requirements, recommendedDevices }: Props): React.JSX.Element {
    const { LL } = useLocalization();

    return (
        <ScreenFrame>
            <LargeTitle title={LL.incompatible.title()} subtitle={LL.incompatible.subtitle()} isCompact />
            <GroupedList>
                {requirements.map((requirement) => (
                    <ListRow
                        key={requirement.name}
                        title={requirement.name}
                        detail={requirement.required}
                        value={requirement.actual}
                        trailing={
                            requirement.isMet ? (
                                <Check size={18} color={PaperInk.ACCENT} strokeWidth={2.8} />
                            ) : (
                                <X size={18} color={PaperInk.DANGER} strokeWidth={2.8} />
                            )
                        }
                    />
                ))}
            </GroupedList>
            <SectionLabel label={LL.incompatible.recommended()} />
            <View style={STYLES.devices}>
                {recommendedDevices.map((device) => (
                    <Text key={device} style={STYLES.device}>
                        {device}
                    </Text>
                ))}
            </View>
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    device: { fontSize: 15, color: PaperInk.TEXT },
    devices: { gap: 6, paddingHorizontal: 4 },
});
