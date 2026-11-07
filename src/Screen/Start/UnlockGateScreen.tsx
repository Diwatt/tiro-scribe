import { observer } from '@legendapp/state/react';
import { CircleAlert } from 'lucide-react-native';
import type React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Notice, PillButton, ScreenFrame, TiroMark } from '@/Components/Kit';
import { Container } from '@/Core/Container';
import { useLocalization } from '@/Localization';
import { UnlockState } from '@/State/Start/UnlockState';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';
import { Tone } from '@/theme/Tone';
import { TypeScale } from '@/theme/TypeScale';

/**
 * Auth-gated boot screen: the database stays locked until the master password
 * decrypts the keyfile. Biometry (Face ID / fingerprint) joins in v2.
 */
export const UnlockGateScreen = observer(function UnlockGateScreen(): React.JSX.Element {
    const { LL } = useLocalization();
    const unlock = Container.get(UnlockState);

    const submit = async (): Promise<void> => {
        await unlock.unlock();
    };

    return (
        <ScreenFrame
            isScrollable={false}
            footer={
                <PillButton
                    label={LL.unlockVault.submit()}
                    onPress={() => void submit()}
                    isDisabled={unlock.isBusy.get()}
                />
            }
        >
            <View style={STYLES.center}>
                <View style={STYLES.tile}>
                    <TiroMark size={76} />
                </View>
                <Text style={[TypeScale.TITLE, STYLES.centered]}>{LL.unlock.title()}</Text>
                <Text style={[TypeScale.SUBHEAD, STYLES.centered]}>{LL.unlock.subtitle()}</Text>
            </View>
            <View style={STYLES.form}>
                <Text style={STYLES.fieldLabel}>{LL.unlockVault.masterPassword()}</Text>
                <TextInput
                    value={unlock.password.get()}
                    onChangeText={(value) => unlock.password.set(value)}
                    secureTextEntry
                    autoCapitalize="none"
                    accessibilityLabel={LL.unlockVault.masterPassword()}
                    style={STYLES.input}
                    onSubmitEditing={() => void submit()}
                />
            </View>
            {unlock.error.get() != null ? (
                <Notice text={unlock.error.get() ?? ''} icon={CircleAlert} tone={Tone.Danger} />
            ) : null}
        </ScreenFrame>
    );
});

const STYLES = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 16 },
    centered: { textAlign: 'center' },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: PaperInk.TEXT_MUTED },
    form: {
        backgroundColor: PaperInk.CARD,
        borderWidth: 1,
        borderColor: PaperInk.LINE,
        borderRadius: Metric.RADIUS_CARD,
        paddingHorizontal: Metric.GUTTER,
        paddingVertical: 10,
        gap: 2,
    },
    input: { fontSize: 17, color: PaperInk.TEXT, paddingVertical: 4 },
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
