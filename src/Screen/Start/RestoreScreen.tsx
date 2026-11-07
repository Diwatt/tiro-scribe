import { zodResolver } from '@hookform/resolvers/zod';
import { observer } from '@legendapp/state/react';
import { CircleAlert } from 'lucide-react-native';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Notice, PillButton, ScreenFrame } from '@/Components/Kit';
import { Container } from '@/Core/Container';
import { useLocalization } from '@/Localization';
import { type RestoreFormData, RestoreSchema } from '@/State/Start';
import { RestoreState } from '@/State/Start/RestoreState';
import { Metric } from '@/theme/Metric';
import { PaperInk } from '@/theme/PaperInk';
import { Tone } from '@/theme/Tone';
import { TypeScale } from '@/theme/TypeScale';

interface Props {
    onBack?: () => void;
}

/**
 * Vault restore entry: recovery code from the paper kit + new master password.
 * Restores a vault whose Therapist row is on this device; cross-device
 * restore of an encrypted bundle is a separate upcoming feature.
 */
export const RestoreScreen = observer(function RestoreScreen({ onBack }: Props): React.JSX.Element {
    const { LL } = useLocalization();
    const restore = Container.get(RestoreState);

    const { watch, setValue, handleSubmit, formState } = useForm<RestoreFormData>({
        defaultValues: RestoreSchema.defaults,
        resolver: zodResolver(RestoreSchema.form),
        mode: 'onSubmit',
    });

    const fieldError = [formState.errors.recoveryCode, formState.errors.newPassword, formState.errors.confirmPassword]
      .find((error) => error?.message)?.message;

    const submit = handleSubmit((data) => {
        restore.recoveryCode.set(data.recoveryCode);
        restore.newPassword.set(data.newPassword);

        return restore.restore();
    });

    const fields = [
        [LL.restoreVault.codeLabel(), watch('recoveryCode'), (value: string) => setValue('recoveryCode', value, { shouldValidate: formState.isSubmitted }), false],
        [LL.restoreVault.passwordLabel(), watch('newPassword'), (value: string) => setValue('newPassword', value, { shouldValidate: formState.isSubmitted }), true],
        [LL.restoreVault.confirmLabel(), watch('confirmPassword'), (value: string) => setValue('confirmPassword', value, { shouldValidate: formState.isSubmitted }), true],
    ] as const;

    return (
        <ScreenFrame
            footer={
                <>
                    <PillButton
                        label={LL.restoreVault.submit()}
                        onPress={() => void submit()}
                        isDisabled={restore.isBusy.get()}
                    />
                    <Text style={STYLES.link} onPress={onBack} accessibilityRole="button">
                        {LL.restoreVault.back()}
                    </Text>
                </>
            }
        >
            <Text style={[TypeScale.TITLE, STYLES.title]}>{LL.restoreVault.title()}</Text>
            <Text style={[TypeScale.SUBHEAD, STYLES.subtitle]}>{LL.restoreVault.subtitle()}</Text>
            <View style={STYLES.form}>
                {fields.map(([label, value, onChange, isSecret], index) => (
                    <View key={label} style={[STYLES.field, index < fields.length - 1 && STYLES.fieldLine]}>
                        <Text style={STYLES.fieldLabel}>{label}</Text>
                        <TextInput
                            value={value}
                            onChangeText={onChange}
                            secureTextEntry={isSecret}
                            autoCapitalize="none"
                            accessibilityLabel={label}
                            style={STYLES.input}
                        />
                    </View>
                ))}
            </View>
            {restore.error.get() != null || fieldError != null ? (
                <Notice text={restore.error.get() ?? fieldError ?? ''} icon={CircleAlert} tone={Tone.Danger} />
            ) : null}
        </ScreenFrame>
    );
});

const STYLES = StyleSheet.create({
    field: { paddingHorizontal: Metric.GUTTER, paddingVertical: 10, gap: 2 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: PaperInk.TEXT_MUTED },
    fieldLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: PaperInk.LINE },
    form: {
        backgroundColor: PaperInk.CARD,
        borderWidth: 1,
        borderColor: PaperInk.LINE,
        borderRadius: Metric.RADIUS_CARD,
    },
    input: { fontSize: 17, color: PaperInk.TEXT, paddingVertical: 4 },
    link: { textAlign: 'center', fontSize: 16, fontWeight: '500', color: PaperInk.ACCENT, paddingVertical: 12 },
    subtitle: { textAlign: 'center', paddingHorizontal: 16 },
    title: { textAlign: 'center', paddingHorizontal: 16 },
});
