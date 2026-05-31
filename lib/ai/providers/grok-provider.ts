/**
 * Grok Provider (via Groq.com API)
 * Uses Groq's OpenAI-compatible endpoint
 */

import { BaseProvider, type ProviderConfig } from "../base-provider";

export class GrokProvider extends BaseProvider {
  private endpoint = "https://api.groq.com/openai/v1/chat/completions";

  constructor(config: ProviderConfig) {
    super(config);
  }

  async complete(prompt: string): Promise<string> {
    const authHeader = `Bearer ${this.apiKey}`;

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
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
      const errorData = await response.text();
      throw new Error(
        `Groq API error: ${response.statusText} - ${errorData}`
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
    return "Grok (Groq)";
  }
}
