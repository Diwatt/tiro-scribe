/**
 * RecoveryKitTemplate – HTML template for the Recovery Kit PDF.
 * Placeholders: {{RECOVERY_CODE}}, {{DATE}}
 */

export const RECOVERY_KIT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; max-width: 480px; margin: 0 auto; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    .warning { color: #b45309; font-weight: 600; font-size: 12px; margin-bottom: 16px; }
    .code-box { font-family: Courier, monospace; font-size: 14px; border: 2px solid #333; padding: 16px; margin: 16px 0; word-break: break-all; }
    .footer { font-size: 11px; color: #666; margin-top: 24px; }
  </style>
</head>
<body>
  <h1>Tiro Scribe – Recovery Kit</h1>
  <p class="warning">CONFIDENTIAL: Keep this document safe. Do not share.</p>
  <div class="code-box">{{RECOVERY_CODE}}</div>
  <p class="footer">Generated on {{DATE}}</p>
</body>
</html>`;
