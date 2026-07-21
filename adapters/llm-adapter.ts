import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("未配置 ANTHROPIC_API_KEY。请在 .env 文件中设置或设置环境变量。");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export interface LlmOptions {
  model?: string;
  maxTokens?: number;
  noLlm?: boolean;
}

const DEFAULT_MODEL = "claude-3-5-haiku-20241022";
const DEFAULT_MAX_TOKENS = 1024;

export async function askPlainLanguage(
  prompt: string,
  options: LlmOptions = {}
): Promise<string> {
  if (options.noLlm) {
    throw new Error("--no-llm 模式下不支持调用 LLM");
  }

  const model = options.model ?? DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

  let anthropic: Anthropic;
  try {
    anthropic = getClient();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`LLM 调用失败：${msg}`);
  }

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("API 返回了空内容，请重试或检查账户额度。");
    }

    const text = textBlock.text.trim();
    if (!text) {
      throw new Error("API 返回了空内容，请重试或检查账户额度。");
    }

    return text;
  } catch (err: unknown) {
    if (err instanceof Anthropic.APIError) {
      if (err.status === 401) {
        throw new Error("API Key 无效或已过期，请检查 ANTHROPIC_API_KEY。");
      }
      if (err.status === 429) {
        throw new Error("API 请求过于频繁，请稍后重试。");
      }
      if (err.status && err.status >= 500) {
        throw new Error("Anthropic 服务暂时不可用，请稍后重试。");
      }
    }

    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
      throw new Error("网络连接失败，无法访问 Anthropic API。请检查网络连接。");
    }

    throw err instanceof Error ? err : new Error(`LLM 调用失败：${msg}`);
  }
}

export function clearClient(): void {
  client = null;
}
