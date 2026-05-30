/**
 * DeepSeek Provider
 */

import { BaseProvider, type ProviderConfig } from "../base-provider";

export class DeepSeekProvider extends BaseProvider {
  private endpoint = "https://api.deepseek.com/chat/completions";

  constructor(config: ProviderConfig) {
    super(config);
  }

  async complete(prompt: string): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `DeepSeek API error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  async verify(): Promise<boolean> {
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 10,
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  getName(): string {
    return "DeepSeek";
  }
}
