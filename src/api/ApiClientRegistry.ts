/**
 * Registry of API clients by model. Use get(Model) to obtain the client; clients are created lazily on first get.
 * Uses @hey-api/openapi-ts generated client (Fetch); baseUrl and interceptors set on first use.
 * Response interceptor: throws ApiClientException on empty body. Error interceptor: wraps failures in ApiClientException.
 */

import isEmpty from 'lodash/isEmpty';
import { AppConfig } from '@/Core/AppConfig';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { ApiClientException } from '../Exception';
import { InferenceModelClient } from './Client/InferenceModelClient';
import { ProfileAttributesClient } from './Client/ProfileAttributesClient';
import { client } from './generated/Client';
import type { ResolvedRequestOptions } from './generated/client/Index';

type ModelClass = typeof ProfileAttributesClient | typeof InferenceModelClient;

export class ApiClientRegistry {
    private readonly clientsByModel = new Map<ModelClass, ProfileAttributesClient | InferenceModelClient>();
    private isConfigured = false;

    public constructor(
        private readonly appConfig: AppConfig,
        private readonly logger: AppLogger,
    ) {}

    public get(model: typeof ProfileAttributesClient): ProfileAttributesClient;
    public get(model: typeof InferenceModelClient): InferenceModelClient;
    public get(model: ModelClass): ProfileAttributesClient | InferenceModelClient {
        let instance = this.clientsByModel.get(model);
        if (instance == null) {
            instance = this.createClient(model);
            this.clientsByModel.set(model, instance);
        }

        return instance;
    }

    private createClient(model: ModelClass): ProfileAttributesClient | InferenceModelClient {
        const httpClient = this.ensureClientConfigured();
        if (model === ProfileAttributesClient) {
            return new ProfileAttributesClient(httpClient);
        }
        if (model === InferenceModelClient) {
            return new InferenceModelClient(httpClient);
        }
        throw new Error(`Unknown model: ${model.name}`);
    }

    private ensureClientConfigured() {
        if (!this.isConfigured) {
            const base = this.appConfig.apiHost;

            // Add request interceptor to log URLs
            client.interceptors.request.use((request: Request, options: ResolvedRequestOptions) => {
                this.logger.debug('[ApiClient] Request URL:', {
                    url: request.url,
                    method: request.method,
                    path: options?.path,
                });
                return request;
            });

            client.interceptors.response.use(this.validateResponse.bind(this));
            client.interceptors.error.use((error: unknown) => ApiClientException.from(error));
            client.setConfig({ baseUrl: base });
            this.isConfigured = true;
        }

        return client;
    }

    private async validateResponse(response: Response): Promise<Response> {
        if (response.ok) {
            const cloned = response.clone();
            let data: unknown;
            try {
                data = await cloned.json();
            } catch {
                data = {};
            }
            if (isEmpty(data)) {
                throw new ApiClientException('Response empty', 'RESPONSE_EMPTY');
            }
        }

        return response;
    }
}

Container.register(ApiClientRegistry, () => new ApiClientRegistry(Container.get(AppConfig), Container.get(AppLogger)));
