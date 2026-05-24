export interface ModelConfig {
  provider: "openrouter";
  model: string;
  apiKey: string;
  baseURL: string;
  maxTokens: number;
}

export function getModelConfig(tier: "free" | "pro"): ModelConfig {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  const baseURL =
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

  if (tier === "pro") {
    return {
      provider: "openrouter",
      model: process.env.PRO_MODEL || "anthropic/claude-sonnet-4",
      apiKey,
      baseURL,
      maxTokens: 1024,
    };
  }

  return {
    provider: "openrouter",
    model: process.env.FREE_MODEL || "deepseek/deepseek-chat-v3-0324",
    apiKey,
    baseURL,
    maxTokens: 1024,
  };
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function callLLM(
  config: ModelConfig,
  system: string,
  messages: Message[],
  stream = false
): Promise<Response> {
  const body = {
    model: config.model,
    max_tokens: config.maxTokens,
    stream,
    messages: [{ role: "system", content: system }, ...messages],
  };

  return fetch(`${config.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://interviewcoach.ai",
      "X-Title": "InterviewCoach",
    },
    body: JSON.stringify(body),
  });
}

export async function callLLMText(
  config: ModelConfig,
  system: string,
  messages: Message[]
): Promise<string> {
  const res = await callLLM(config, system, messages, false);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
