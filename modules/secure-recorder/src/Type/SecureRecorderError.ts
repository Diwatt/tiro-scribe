import type { ErrorCode } from '../ErrorCode';

export interface SecureRecorderError {
    code: ErrorCode;
    message: string;
    details?: unknown;
}
