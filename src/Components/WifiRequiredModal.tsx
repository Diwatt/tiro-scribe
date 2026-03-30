import { observer } from '@legendapp/state/react';
import { AlertTriangle, WifiOff } from 'lucide-react-native';
import type React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button, Surface, useTheme } from 'react-native-paper';
import { useLocalization } from '@/Localization';
import type { ExtendedTheme } from '@/theme/AppTheme';

export interface WifiRequiredModalProps {
    readonly visible: boolean;
    readonly downloadSizeMB: number;
    readonly onOpenWifiSettings: () => void;
    readonly onDownloadAnyway: () => void;
    readonly onClose: () => void;
}

export const WifiRequiredModal = observer((props: WifiRequiredModalProps): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();
    const { LL } = useLocalization();

    const {
        visible,
        downloadSizeMB,
        onOpenWifiSettings,
        onDownloadAnyway,
        onClose,
    } = props;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={STYLES.modalOverlay}>
                <Surface style={[STYLES.modalContent, { backgroundColor: theme.colors.surface }]}>
                    <View style={STYLES.modalHeader}>
                        <AlertTriangle size={32} color={theme.colors.primary} />
                        <Text style={[STYLES.modalTitle, { color: theme.colors.onSurface }]}>
                            {LL.home.modalTitle()}
                        </Text>
                    </View>

                    <View style={STYLES.modalBody}>
                        <Text style={[STYLES.modalText, { color: theme.colors.onSurfaceVariant }]}>
                            {LL.home.modalDownloadDescription({ downloadSizeMB })}
                        </Text>

                        <Text style={[STYLES.modalText, { color: theme.colors.onSurfaceVariant }]}>
                            {LL.home.modalModelsDescription()}
                        </Text>

                        <View style={[STYLES.wifiStatus, { backgroundColor: theme.colors.statusWarning.background }]}>
                            <WifiOff size={20} color={theme.colors.statusWarning.text} />
                            <Text style={[STYLES.wifiText, { color: theme.colors.statusWarning.text }]}>
                                {LL.home.wifiRequired()}
                            </Text>
                        </View>
                    </View>

                    <View style={STYLES.modalActions}>
                        <Button
                            mode="contained"
                            onPress={onOpenWifiSettings}
                            style={STYLES.modalButton}
                        >
                            {LL.home.openWifiSettings()}
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={onDownloadAnyway}
                            style={STYLES.modalButton}
                        >
                            {LL.home.downloadAnyway()}
                        </Button>
                        <Button
                            mode="text"
                            onPress={onClose}
                            style={STYLES.modalButton}
                        >
                            {LL.home.remindMeLater()}
                        </Button>
                    </View>
                </Surface>
            </View>
        </Modal>
    );
});

const STYLES = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 24 },
    modalHeader: { alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700', marginTop: 12, textAlign: 'center' },
    modalBody: { marginBottom: 24 },
    modalText: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
    bold: { fontWeight: '700' },
    wifiStatus: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginTop: 8 },
    wifiText: { fontSize: 14, marginLeft: 8, fontWeight: '500' },
    cellularWarning: { padding: 12, borderRadius: 8, marginTop: 16 },
    cellularText: { fontSize: 13, lineHeight: 18 },
    modalActions: { gap: 12 },
    modalButton: { width: '100%' },
});