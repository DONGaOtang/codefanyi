import { describe, it, expect, beforeEach } from "vitest";
import { sanitizePath, sanitizeSymbol, sanitizeStructure, canSendToLLM, setMappingStore } from "../../privacy/sanitize.js";
import { trimToBudget, estimateTokens, budgetPerSection, getMaxContextChars } from "../../privacy/token-budget.js";
import { MappingStore } from "../../privacy/mapping-store.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rm } from "node:fs/promises";

let mockStore: { mappings: Map<string, string> };

beforeEach(() => {
  mockStore = { mappings: new Map() };
  setMappingStore({
    getRealPath(alias: string) { return mockStore.mappings.get(alias) ?? ""; },
    registerMapping(real: string, alias: string) { mockStore.mappings.set(alias, real); },
  });
});

describe("sanitizePath", () => {
  it("should return empty in strict mode", () => {
    expect(sanitizePath("C:\\project\\src\\index.ts", "C:\\project", "strict")).toBe("");
  });

  it("should return relative path in off mode", () => {
    expect(sanitizePath("C:\\project\\src\\index.ts", "C:\\project", "off")).toBe("src/index.ts");
  });

  it("should return anonymized alias in default mode", () => {
    const result = sanitizePath("C:\\project\\src\\index.ts", "C:\\project", "default");
    expect(result).toMatch(/^file_[0-9a-f]{1,6}$/);
    expect(result).not.toContain("src");
    expect(result).not.toContain("index");
  });

  it("should register mapping in default mode", () => {
    sanitizePath("C:\\project\\src\\login.ts", "C:\\project", "default");
    expect(mockStore.mappings.size).toBeGreaterThan(0);
  });
});

describe("sanitizeSymbol", () => {
  it("should return empty in strict mode", () => {
    expect(sanitizeSymbol("LoginPage", "strict")).toBe("");
  });

  it("should return original in off mode", () => {
    expect(sanitizeSymbol("LoginPage", "off")).toBe("LoginPage");
  });

  it("should return anonymized alias in default mode", () => {
    const result = sanitizeSymbol("LoginPage", "default");
    expect(result).toMatch(/^symbol_[0-9a-f]{1,6}$/);
    expect(result).not.toContain("LoginPage");
  });
});

describe("sanitizeStructure", () => {
  const structure = {
    files: [{ path: "C:\\project\\src\\index.ts", name: "index" }],
    nodes: [{ id: "n1", name: "App" }],
  };

  it("should return null in strict mode", () => {
    expect(sanitizeStructure(structure, "strict")).toBeNull();
  });

  it("should return original in off mode", () => {
    const result = sanitizeStructure(structure, "off");
    expect(result).toEqual(structure);
  });

  it("should anonymize paths in default mode", () => {
    const result = sanitizeStructure(structure, "default");
    expect(result).not.toBeNull();
    const files = result!["files"] as Array<Record<string, unknown>>;
    const filePath = files[0]["path"] as string;
    expect(filePath).toMatch(/^path_[0-9a-f]{1,6}$/);
  });
});

describe("canSendToLLM", () => {
  it("should block structure in strict mode", () => {
    expect(canSendToLLM("strict", "structure")).toBe(false);
  });

  it("should block path in strict mode", () => {
    expect(canSendToLLM("strict", "path")).toBe(false);
  });

  it("should allow symbol in strict mode", () => {
    expect(canSendToLLM("strict", "symbol")).toBe(true);
  });

  it("should allow everything in default mode", () => {
    expect(canSendToLLM("default", "structure")).toBe(true);
    expect(canSendToLLM("default", "path")).toBe(true);
  });
});

describe("trimToBudget", () => {
  it("should not trim when within budget", () => {
    const result = trimToBudget("short text", 100);
    expect(result.wasTrimmed).toBe(false);
    expect(result.content).toBe("short text");
  });

  it("should trim when exceeding budget", () => {
    const longText = "a".repeat(1000);
    const result = trimToBudget(longText, 100);
    expect(result.wasTrimmed).toBe(true);
    expect(result.originalLength).toBe(1000);
    expect(result.content.length).toBeLessThan(150);
  });

  it("should include trim note when trimmed", () => {
    const longText = "a".repeat(1000);
    const result = trimToBudget(longText, 100);
    expect(result.content).toContain("内容已裁剪");
  });

  it("should use env var for max chars", () => {
    process.env.EXPLAIN_MAX_CONTEXT_CHARS = "500";
    expect(getMaxContextChars()).toBe(500);
    delete process.env.EXPLAIN_MAX_CONTEXT_CHARS;
  });

  it("should default to 60000 when no env var", () => {
    expect(getMaxContextChars()).toBe(60000);
  });
});

describe("estimateTokens", () => {
  it("should estimate 1 token per 4 chars", () => {
    expect(estimateTokens(100)).toBe(25);
    expect(estimateTokens(101)).toBe(26);
  });
});

describe("budgetPerSection", () => {
  it("should divide evenly", () => {
    expect(budgetPerSection(1000, 4)).toBe(250);
  });

  it("should return total for 0 sections", () => {
    expect(budgetPerSection(1000, 0)).toBe(1000);
  });
});

describe("MappingStore", () => {
  it("should store and resolve mappings", async () => {
    const tmpDir = join(tmpdir(), `map-test-${Date.now()}`);
    const store = new MappingStore(tmpDir);
    await store.init();

    store.register("src/index.ts", "file_1");
    expect(store.resolve("file_1")).toBe("src/index.ts");
    expect(store.getAlias("src/index.ts")).toBe("file_1");

    await rm(tmpDir, { recursive: true, force: true });
  });

  it("should persist and reload mappings", async () => {
    const tmpDir = join(tmpdir(), `map-test-${Date.now()}-2`);
    const store = new MappingStore(tmpDir);
    await store.init();
    store.register("src/a.ts", "file_a");
    await store.save();

    const store2 = new MappingStore(tmpDir);
    await store2.init();
    expect(store2.resolve("file_a")).toBe("src/a.ts");

    await rm(tmpDir, { recursive: true, force: true });
  });
});
