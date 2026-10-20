import type { AiCallResult, AiProviderInfo, AiRequestPayload } from "../aiTypes";

/**
 * Single-provider interface. Implementations must not log API keys.
 */
export interface AiProvider {
  readonly info: AiProviderInfo;
  /**
   * Execute a task. Network providers receive an API key from the caller —
   * they must not persist it. Mock ignores the key.
   */
  complete(payload: AiRequestPayload, apiKey: string | null): Promise<AiCallResult>;
}
