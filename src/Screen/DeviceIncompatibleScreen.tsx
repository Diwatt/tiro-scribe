import { Smartphone } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text } from 'react-native';
import { IconTile, LargeTitle, Panel, ScreenFrame } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { PaperInk } from '@/theme/PaperInk';
import { Tone } from '@/theme/Tone';

/** Shown when the hardware gate rejects the phone. */
export function DeviceIncompatibleScreen(): React.JSX.Element {
    const { LL } = useLocalization();

    return (
        <ScreenFrame>
            <IconTile icon={Smartphone} tone={Tone.Ochre} size={56} />
            <LargeTitle title={LL.device.notSupported()} subtitle={LL.device.notSupportedMessage()} isCompact />
            <Panel>
                <Text style={STYLES.hint}>{LL.device.notSupportedHint()}</Text>
            </Panel>
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    hint: { fontSize: 15, lineHeight: 22, color: PaperInk.TEXT_READING },
});
