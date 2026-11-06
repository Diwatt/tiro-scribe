import { observer } from '@legendapp/state/react';
import { WifiOff } from 'lucide-react-native';
import type React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ButtonKind, Notice, PillButton } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';
import { Tone } from '@/theme/Tone';
import { TypeScale } from '@/theme/TypeScale';

export interface WifiRequiredModalProps {
    readonly visible: boolean;
    readonly downloadSizeMB: number;
    readonly onOpenWifiSettings: () => void;
    readonly onDownloadAnyway: () => void;
    readonly onClose: () => void;
}

/** Bottom sheet asking for Wi-Fi before downloading the on-device models. */
export const WifiRequiredModal = observer((props: WifiRequiredModalProps): React.JSX.Element => {
    const { LL } = useLocalization();
    const insets = useSafeAreaInsets();

    return (
        <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
            <View style={STYLES.backdrop}>
                <View style={[STYLES.sheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={STYLES.grabber} />
                    <Text style={TypeScale.TITLE_SMALL}>{LL.home.modalTitle()}</Text>
                    <Text style={TypeScale.SUBHEAD}>{LL.home.modalDownloadDescription({ downloadSizeMB: props.downloadSizeMB })}</Text>
                    <Text style={TypeScale.SUBHEAD}>{LL.home.modalModelsDescription()}</Text>
                    <Notice text={LL.home.wifiRequired()} icon={WifiOff} tone={Tone.Ochre} />
                    <PillButton label={LL.home.openWifiSettings()} onPress={props.onOpenWifiSettings} />
                    <PillButton label={LL.home.downloadAnyway()} kind={ButtonKind.Outline} onPress={props.onDownloadAnyway} />
                    <Text style={STYLES.link} onPress={props.onClose} accessibilityRole="button">
                        {LL.home.remindMeLater()}
                    </Text>
                </View>
            </View>
        </Modal>
    );
});

const STYLES = StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: PaperInk.SCRIM },
    grabber: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: PaperInk.LINE_STRONG },
    link: { textAlign: 'center', fontSize: 16, fontWeight: '500', color: PaperInk.ACCENT, paddingVertical: 10 },
    sheet: {
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 10,
        borderTopLeftRadius: Metric.RADIUS_SHEET,
        borderTopRightRadius: Metric.RADIUS_SHEET,
        backgroundColor: PaperInk.CARD,
    },
});
