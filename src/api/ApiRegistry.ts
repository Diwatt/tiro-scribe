/**
 * Registry of API clients by model. Use get(Model) to obtain the client; clients are created lazily on first get.
 * Uses @hey-api/openapi-ts generated client; axios + baseURL set on first use.
 * Response interceptor: throws ApiClientException on empty body. Error interceptor: wraps failures in ApiClientException.
 */

import axios from 'axios';
import { AppConfig } from '@/Config';
import { ApiClientException } from '@/Exception';
import isEmpty from 'lodash/isEmpty';
import { ClinicalAttributes } from './Client/ClinicalAttributes';
import { ModelArtifact } from './Client/ModelArtifact';
import { client } from './generated/Client';
import type { Client } from './generated/client/Index';

type ModelClass = typeof ClinicalAttributes | typeof ModelArtifact;

export class ApiRegistry {
    private readonly clientByModel = new Map<
        ModelClass,
        ClinicalAttributes | ModelArtifact
    >();
    private configured = false;

    public get(model: typeof ClinicalAttributes): ClinicalAttributes;
    public get(model: typeof ModelArtifact): ModelArtifact;
    public get(model: ModelClass): ClinicalAttributes | ModelArtifact {
        let c = this.clientByModel.get(model);
        if (c == null) {
            c = this.createClient(model);
            this.clientByModel.set(model, c);
        }

        return c;
    }

    private ensureClientConfigured(): Client {
        if (!this.configured) {
            const baseURL =
                AppConfig.apiHost.trim().replace(/\/$/, '') ||
                AppConfig.apiRequestPathPrefix;
            const axiosInstance = axios.create({ baseURL: baseURL || undefined });
            axiosInstance.interceptors.response.use(
                (response) => {
                    if (isEmpty(response.data)) {
                        throw new ApiClientException('Response empty', 'RESPONSE_EMPTY');
                    }

                    return response;
                },
                (error) => {
                    throw ApiClientException.from(error);
                },
            );
            client.setConfig({
                axios: axiosInstance,
                baseURL: AppConfig.apiHost || AppConfig.apiRequestPathPrefix,
            });
            this.configured = true;
        }

        return client as Client;
    }

    private createClient(model: ModelClass): ClinicalAttributes | ModelArtifact {
        const api = this.ensureClientConfigured();
        if (model === ClinicalAttributes) {
            return new ClinicalAttributes(api);
        }
        if (model === ModelArtifact) {
            return new ModelArtifact(api);
        }
        throw new Error(`Unknown model: ${(model as ModelClass).name}`);
    }
}

export const apiRegistry = new ApiRegistry();
export { ClinicalAttributes } from './Client/ClinicalAttributes';
export { ModelArtifact } from './Client/ModelArtifact';
