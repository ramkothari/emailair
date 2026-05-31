/**
 * AI Provider Factory
 * 
 * Single point where provider is selected based on environment variable
 * The rest of the app never directly instantiates providers
 */

import { BaseProvider, type ProviderConfig } from "./base-provider";
import { OpenAIProvider } from "./providers/openai-provider";
import { GrokProvider } from "./providers/grok-provider";
import { GeminiProvider } from "./providers/gemini-provider";
import { DeepSeekProvider } from "./providers/deepseek-provider";
import { ClaudeProvider } from "./providers/claude-provider";

export type SupportedProvider = "openai" | "grok" | "gemini" | "deepseek" | "claude";

export class ProviderFactory {
  /**
   * IMPORTANT: We intentionally do NOT cache the provider instance
   * This ensures environment variables are loaded fresh each time
   * Previously, singleton caching could cause stale API keys to be used
   * After .env.local updates, old keys would persist in cached provider
   * 
   * Solution: Create new provider on each call to pick up latest env vars
   */
  
  static getProvider(): BaseProvider {
    const providerName = (process.env.AI_PROVIDER || "openai").toLowerCase();
    const config = this.getProviderConfig(providerName);

    return this.createProvider(providerName, config);
  }

  static reset(): void {
    // No-op: We don't cache anymore, so nothing to reset
  }

  private static createProvider(
    name: string,
    config: ProviderConfig
  ): BaseProvider {
    switch (name) {
      case "openai":
        return new OpenAIProvider(config);
      case "grok":
        return new GrokProvider(config);
      case "gemini":
        return new GeminiProvider(config);
      case "deepseek":
        return new DeepSeekProvider(config);
      case "claude":
        return new ClaudeProvider(config);
      default:
        throw new Error(`Unknown AI provider: ${name}`);
    }
  }

  private static getProviderConfig(provider: string): ProviderConfig {
    const apiKey = this.getApiKey(provider);

    return {
      apiKey,
      model: this.getModel(provider),
      temperature: 0.7,
      maxTokens: 2000,
    };
  }

  private static getApiKey(provider: string): string {
    const keys: Record<string, string | undefined> = {
      openai: process.env.OPENAI_API_KEY,
      grok: process.env.GROK_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY,
      claude: process.env.CLAUDE_API_KEY,
    };

    const key = keys[provider];

    if (!key) {
      throw new Error(
        `Missing API key for provider '${provider}'. Set ${this.getEnvKeyName(provider)} in .env.local`
      );
    }

    return key;
  }

  private static getModel(provider: string): string {
    const models: Record<string, string> = {
      openai: "gpt-4-turbo",
      grok: "llama-3.3-70b-versatile",
      gemini: "gemini-2.0-flash",
      deepseek: "deepseek-chat",
      claude: "claude-3-5-sonnet-20241022",
    };

    return models[provider] || "unknown";
  }

  private static getEnvKeyName(provider: string): string {
    const keys: Record<string, string> = {
      openai: "OPENAI_API_KEY",
      grok: "GROK_API_KEY",
      gemini: "GEMINI_API_KEY",
      deepseek: "DEEPSEEK_API_KEY",
      claude: "CLAUDE_API_KEY",
    };

    return keys[provider] || "UNKNOWN_API_KEY";
  }

  static getSupportedProviders(): SupportedProvider[] {
    return ["openai", "grok", "gemini", "deepseek", "claude"];
  }

  static getCurrentProvider(): string {
    return (process.env.AI_PROVIDER || "openai").toLowerCase();
  }
}
