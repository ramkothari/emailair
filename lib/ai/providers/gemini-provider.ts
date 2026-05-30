/**
 * Google Gemini Provider
 */

import { BaseProvider, type ProviderConfig } from "../base-provider";

export class GeminiProvider extends BaseProvider {
  private endpoint = "https://generativelanguage.googleapis.com/v1beta/models";

  constructor(config: ProviderConfig) {
    super(config);
  }

  async complete(prompt: string): Promise<string> {
    const url = `${this.endpoint}/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: this.temperature,
          maxOutputTokens: this.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Gemini API error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  async verify(): Promise<boolean> {
    try {
      const url = `${this.endpoint}/gemini-pro:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "ping",
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 10,
          },
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  getName(): string {
    return "Gemini";
  }
}
