import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { askPlainLanguage, clearClient } from "../../adapters/llm-adapter.js";

beforeEach(() => {
  clearClient();
  delete process.env.ANTHROPIC_API_KEY;
});

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
});

describe("askPlainLanguage", () => {
  it("should throw when no API key configured", async () => {
    await expect(askPlainLanguage("test prompt")).rejects.toThrow("未配置 ANTHROPIC_API_KEY");
  });

  it("should throw when --no-llm is set", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    await expect(askPlainLanguage("test", { noLlm: true })).rejects.toThrow("--no-llm 模式下不支持调用 LLM");
  });

  it("should throw on empty API key", async () => {
    process.env.ANTHROPIC_API_KEY = "";
    await expect(askPlainLanguage("test")).rejects.toThrow("未配置 ANTHROPIC_API_KEY");
  });

  it("should throw on network error simulation", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
    // The actual call will fail with network error since key is fake
    await expect(askPlainLanguage("test")).rejects.toThrow();
  });
});
