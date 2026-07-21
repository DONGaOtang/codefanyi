import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../adapters/llm-adapter.js", () => ({
  askPlainLanguage: vi.fn(),
}));

import { explainError } from "../../plain-language/error-decode.js";
import { explainProject } from "../../plain-language/project-scan.js";
import { explainRelation } from "../../plain-language/relation-graph.js";
import { explainImpact } from "../../plain-language/impact-check.js";
import { askPlainLanguage } from "../../adapters/llm-adapter.js";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(askPlainLanguage).mockRejectedValue(new Error("no LLM"));
});

describe("explainError (M8)", () => {
  it("should explain undefined error without LLM", async () => {
    const result = await explainError("TypeError: Cannot read properties of undefined", { noLlm: true });
    expect(result).toContain("它在说什么");
    expect(result).toContain("空盒子");
  });

  it("should explain SyntaxError without LLM", async () => {
    const result = await explainError("SyntaxError: Unexpected token", { noLlm: true });
    expect(result).toContain("SyntaxError");
  });

  it("should handle non-error input", async () => {
    const result = await explainError("今天天气不错", { noLlm: true });
    expect(result).toContain("它在说什么");
  });

  it("should explain timeout error", async () => {
    const result = await explainError("Error: Connection timeout after 30000ms", { noLlm: true });
    expect(result).toContain("超时");
  });
});

describe("explainProject (M3)", () => {
  it("should handle missing UA graph gracefully", async () => {
    const result = await explainProject("/nonexistent/path", { noLlm: true });
    expect(result).toContain("这个项目是什么");
    expect(result).toContain("无法获取");
  });
});

describe("explainRelation (M7)", () => {
  it("should handle missing data without crashing", async () => {
    const result = await explainRelation("/nonexistent/path", { noLlm: true });
    expect(result).toContain("整体关系");
  });
});

describe("explainImpact (M9)", () => {
  it("should handle missing git without crashing", async () => {
    const result = await explainImpact("/nonexistent/path", "src/test.ts", { noLlm: true });
    expect(result).toContain("你改的东西");
    expect(result).toContain("建议");
  });
});
