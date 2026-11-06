import type React from 'react';
import { StyleSheet, Text } from 'react-native';
import { GroupedList, LargeTitle, ListRow, NavigationBar, ScreenFrame, SectionLabel, SwitchRow } from '@/Components/Kit';
import { useLocalization } from '@/Localization';
import { PaperInk } from '@/theme/PaperInk';

interface Props {
    isBiometricOn: boolean;
    autoLockLabel: string;
    isKitSaved: boolean;
    onBack?: () => void;
    onBiometricChange?: (isOn: boolean) => void;
    onAutoLock?: () => void;
    onChangePassword?: () => void;
    onKit?: () => void;
}

/** Security settings: app access and encrypted vault. */
export function SecurityPageScreen(props: Props): React.JSX.Element {
    const { LL } = useLocalization();

    return (
        <ScreenFrame>
            <NavigationBar backLabel={LL.settingsHome.title()} onBack={props.onBack} />
            <LargeTitle title={LL.settingsHome.security()} />
            <SectionLabel label={LL.securityPage.access()} />
            <GroupedList>
                <SwitchRow title={LL.securityPage.faceId()} isOn={props.isBiometricOn} onChange={props.onBiometricChange} />
                <ListRow title={LL.securityPage.autoLock()} value={props.autoLockLabel} onPress={props.onAutoLock} />
            </GroupedList>
            <SectionLabel label={LL.securityPage.vault()} />
            <GroupedList>
                <ListRow title={LL.securityPage.changePassword()} onPress={props.onChangePassword} />
                <ListRow
                    title={LL.securityPage.kit()}
                    value={props.isKitSaved ? LL.securityPage.kitSaved() : undefined}
                    onPress={props.onKit}
                />
            </GroupedList>
            <Text style={STYLES.footnote}>{LL.securityPage.footnote()}</Text>
        </ScreenFrame>
    );
}

const STYLES = StyleSheet.create({
    footnote: { fontSize: 13, lineHeight: 18, color: PaperInk.TEXT_MUTED, paddingHorizontal: 8 },
});
