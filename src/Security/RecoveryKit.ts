/**
 * RecoveryKit – Handles exposing the recovery code as a confidential artifact: copy to clipboard, or PDF + share.
 */

import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Container } from '../Container';
import { RECOVERY_KIT_HTML } from './RecoveryKitTemplate';

export class RecoveryKit {
    private readonly logger = Container.logger;

    /**
     * Copies the recovery code to the system clipboard.
     */
    public async copyToClipboard(recoveryCode: string): Promise<void> {
        await Clipboard.setStringAsync(recoveryCode);
    }

    /**
     * Generates a PDF from the recovery code and writes it to a temp file.
     * @returns File URI of the generated PDF.
     * @throws On print failure.
     */
    public async generatePdf(recoveryCode: string): Promise<string> {
        const html = this.buildHtml(recoveryCode);
        const { uri } = await Print.printToFileAsync({ html });

        return uri;
    }

    /**
     * Opens the OS share sheet for the given file URI.
     * @throws If sharing is not available on this device.
     */
    public async share(uri: string): Promise<void> {
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
            this.logger.error('[RecoveryKit] Sharing not available on this device');
            throw new Error('Sharing is not available on this device.');
        }
        await Sharing.shareAsync(uri, {
            // biome-ignore lint/style/useNamingConvention: <third party>
            UTI: '.pdf',
            mimeType: 'application/pdf',
        });
    }

    private buildHtml(recoveryCode: string): string {
        const escapedCode = recoveryCode.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const date = new Date().toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        return RECOVERY_KIT_HTML.replace('{{RECOVERY_CODE}}', escapedCode).replace('{{DATE}}', date);
    }
}
