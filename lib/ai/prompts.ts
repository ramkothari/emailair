/**
 * AI Prompt Templates
 * 
 * These are used by controllers to call providers consistently.
 * Keep prompts separate from provider implementations.
 */

export function createIntentPrompt(userInput: string): string {
  return `Analyze this user intent for email management and extract the core action intent.

User Input: "${userInput}"

Respond with ONLY valid JSON (no markdown, no extra text):
{
  "intent": "delete" | "archive" | "keep" | "export" | "summarize" | "unknown",
  "confidence": 0-100,
  "target": "all" | "selected" | "query_result" | null,
  "reasoning": "brief explanation"
}`;
}

export function createAnalysisPrompt(emailBodies: string[]): string {
  return `Analyze these emails for patterns, key themes, and actionable insights.

Emails:
${emailBodies.map((body, i) => `Email ${i + 1}:\n${body}\n`).join("\n---\n")}

Respond with ONLY valid JSON:
{
  "themes": ["theme1", "theme2"],
  "patterns": ["pattern1", "pattern2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "summary": "one sentence summary of all emails"
}`;
}

export function createRiskPrompt(emailBodies: string[]): string {
  return `Assess the risk level of deleting or archiving these emails.

Emails:
${emailBodies.map((body, i) => `Email ${i + 1}:\n${body}\n`).join("\n---\n")}

Respond with ONLY valid JSON:
{
  "riskLevel": "low" | "medium" | "high",
  "riskScore": 0-100,
  "concerns": ["concern1", "concern2"],
  "safe": true | false,
  "recommendation": "brief recommendation"
}`;
}

export function createSummaryPrompt(emailBodies: string[]): string {
  return `Create a concise summary of these emails for quick reference.

Emails:
${emailBodies.map((body, i) => `Email ${i + 1}:\n${body}\n`).join("\n---\n")}

Respond with ONLY valid JSON:
{
  "summary": "2-3 sentence summary",
  "keyPoints": ["point1", "point2", "point3"],
  "actionItems": ["action1", "action2"],
  "senders": ["sender1", "sender2"]
}`;
}
