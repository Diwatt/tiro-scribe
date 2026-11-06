import { ScanFace } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PillButton, ScreenFrame, TiroMark } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { PaperInk } from '@/theme/PaperInk';
import { TypeScale } from '@/theme/TypeScale';

interface Props {
    onBiometric?: () => void;
    onPassword?: () => void;
}

/** Lock screen shown on return to the app. */
export function UnlockScreen({ onBiometric, onPassword }: Props): React.JSX.Element {
    const { LL } = useLocalization();

    return (
        <ScreenFrame
            isScrollable={false}
            footer={
                <>
                    <PillButton label={LL.unlock.faceId()} icon={ScanFace} onPress={onBiometric} />
                    <Text style={STYLES.link} onPress={onPassword} accessibilityRole="button">
                        {LL.unlock.password()}
                    </Text>
                </>
            }
        >
            <View style={STYLES.center}>
                <View style={STYLES.tile}>
                    <TiroMark size={76} />
                </View>
                <Text style={[TypeScale.TITLE, STYLES.centered]}>{LL.unlock.title()}</Text>
                <Text style={[TypeScale.SUBHEAD, STYLES.centered]}>{LL.unlock.subtitle()}</Text>
            </View>
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 16 },
    centered: { textAlign: 'center' },
    link: { textAlign: 'center', fontSize: 16, fontWeight: '500', color: PaperInk.ACCENT, paddingVertical: 12 },
    tile: {
        width: 96,
        height: 96,
        borderRadius: 24,
        backgroundColor: PaperInk.BRAND_GROUND,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
});
