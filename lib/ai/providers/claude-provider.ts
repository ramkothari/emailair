/**
 * Anthropic Claude Provider
 */

import { BaseProvider, type ProviderConfig } from "../base-provider";

export class ClaudeProvider extends BaseProvider {
  private endpoint = "https://api.anthropic.com/v1/messages";

  constructor(config: ProviderConfig) {
    super(config);
  }

  async complete(prompt: string): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Claude API error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.content?.[0]?.text || "";
  }

  async verify(): Promise<boolean> {
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 10,
          messages: [
            {
              role: "user",
              content: "ping",
            },
          ],
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  getName(): string {
    return "Claude";
  }
}
