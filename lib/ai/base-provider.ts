/**
 * BaseProvider - Abstract base class for all AI providers
 * 
 * Responsibility: Send prompt to LLM, receive raw text
 * DOES NOT: validate, parse, cache, rate limit
 */

export type ProviderConfig = {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
};

export abstract class BaseProvider {
  protected apiKey: string;
  protected model: string;
  protected temperature: number;
  protected maxTokens: number;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) {
      throw new Error(`API key required for ${this.constructor.name}`);
    }

    this.apiKey = config.apiKey;
    this.model = config.model;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 2000;
  }

  /**
   * Send prompt to LLM and get raw text response
   * Implemented by each provider
   */
  abstract complete(prompt: string): Promise<string>;

  /**
   * Verify provider is properly configured
   */
  abstract verify(): Promise<boolean>;

  /**
   * Get provider name for logging/identification
   */
  abstract getName(): string;
}
