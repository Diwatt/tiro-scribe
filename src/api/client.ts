/**
 * Custom fetch instance for Orval – React Native compatible.
 * In mock mode, returns data from local JSON; otherwise calls configured base URL.
 *
 * Orval mutator signature: (url: string, config?: RequestInit) => Promise<T>
 */

import { AppConfig } from '@/Config';

const MOCK_DELAY_MS = 500;

/** Set to true to use local JSON mocks (offline / no backend). */
const USE_MOCK_API = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

function delay<T>(ms: number, value: T): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const MOCK_MODELS: Record<string, unknown> = {
    speaker_id: {
        id: 'cam-pp-voxceleb-en-16k',
        use_case: 'speaker_id',
        version: '1.0.0',
        url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/wespeaker_en_voxceleb_CAM++.onnx',
        hash: 'sha256:',
        size_bytes: 29_000_000,
        min_app_version: '0.0.0',
    },
    vad: {
        id: 'vad-default',
        use_case: 'vad',
        version: '1.0.0',
        url: 'https://example.com/models/vad.onnx',
        hash: 'sha256:',
        size_bytes: 0,
        min_app_version: '0.0.0',
    },
};

function loadMock(path: string): { data: unknown; status: 200; headers: Headers } | null {
    if (path.includes('/models')) {
        return { data: MOCK_MODELS, status: 200, headers: new Headers() };
    }
    if (path.includes('/taxonomy')) {
        return {
            data: {
                qualifications: require('./mocks/qualifications.json'),
                therapyMethods: require('./mocks/therapy-methods.json'),
                languages: require('./mocks/languages.json'),
            },
            status: 200,
            headers: new Headers(),
        };
    }
    return null;
}

/**
 * Orval custom mutator. Called by generated hooks.
 * In mock mode returns { data, status, headers } from local JSON; otherwise fetches from AppConfig.apiBaseUrl.
 */
export const customInstance = async <T>(url: string, config?: RequestInit): Promise<T> => {
    if (USE_MOCK_API) {
        const mock = loadMock(url);
        if (mock !== null) {
            await delay(MOCK_DELAY_MS, undefined);
            return mock as T;
        }
    }

    const baseUrl = AppConfig.apiBaseUrl;
    const fullUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}${url}` : url;
    const response = await fetch(fullUrl, {
        ...config,
        headers: {
            Accept: 'application/json',
            ...(config?.headers as Record<string, string>),
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API ${response.status}: ${text}`);
    }

    const json = (await response.json()) as unknown;
    return { data: json, status: 200, headers: response.headers } as T;
};
