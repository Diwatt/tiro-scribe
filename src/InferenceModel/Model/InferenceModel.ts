/**
 * InferenceModel – Base interface for model-specific inference wrappers.
 *
 * Each model type (speaker_id, VAD, ASR, pitch) has unique preprocessing,
 * postprocessing, and session management needs. This interface ensures
 * consistent initialization and runtime behavior across all model types.
 *
 * Responsibilities:
 *   * Load model configuration and ONNX files
 *   * Initialize one or more InferenceSession instances
 *   * Handle preprocessing (audio → features)
 *   * Execute inference via Runtime
 *   * Handle postprocessing (raw output → domain object)
 */
export interface InferenceModel<TArgs extends unknown[] = unknown[], TResult = unknown> {
    /**
     * Initialize the model: download files, parse config, create sessions.
     * Safe to call multiple times; subsequent calls are no-ops if already loaded.
     */
    initialize(): Promise<void>;

    /**
     * Release all sessions and clear state to free memory.
     */
    dispose(): Promise<void>;

    /**
     * Return true if the model has been initialized and is ready to run.
     */
    isReady(): Promise<boolean>;

    /**
     * Execute a model-specific inference run.
     *
     * Different models may accept different arguments (e.g. multiple sessions,
     * custom shapes, or additional metadata), so the signature is intentionally
     * loose.
     */
    run(...args: TArgs): Promise<TResult>;
}
