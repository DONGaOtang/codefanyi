import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("node:child_process", () => ({ execSync: vi.fn() }));
vi.mock("node:fs/promises", () => ({ access: vi.fn() }));

import { execSync } from "node:child_process";
import { access } from "node:fs/promises";
import { getRelationSummary, getImpactSummary } from "../../adapters/codegraph-adapter.js";

beforeEach(() => {
  vi.clearAllMocks();
});

// Helper: execSync mock with simplified types for testing
function mockExec(cb: (cmd: string) => string) {
  vi.mocked(execSync).mockImplementation(cb as any);
}

describe("getRelationSummary", () => {
  it("should return missing when codegraph not installed", async () => {
    mockExec(() => { throw new Error("not found"); });
    const result = await getRelationSummary("/test/project");
    expect(result.status).toBe("missing");
    expect(result.summary).toContain("可选增强未启用");
  });

  it("should return missing when .codegraph index not found", async () => {
    mockExec((s) => s.includes("--version") ? "v1.0.0" : (() => { throw new Error(""); }) as any);
    vi.mocked(access).mockRejectedValue(new Error("ENOENT"));
    const result = await getRelationSummary("/test/project");
    expect(result.status).toBe("missing");
    expect(result.summary).toContain("codegraph init");
  });

  it("should return available when codegraph works", async () => {
    mockExec((s) => {
      if (s.includes("--version")) return "v1.0.0";
      if (s.includes("explore")) return "Module A -> Module B";
      throw new Error("unexpected");
    });
    vi.mocked(access).mockResolvedValue(undefined);

    const result = await getRelationSummary("/test/project");
    expect(result.status).toBe("available");
    expect(result.summary).toBe("Module A -> Module B");
  });

  it("should return failed when command fails", async () => {
    mockExec((s) => {
      if (s.includes("--version")) return "v1.0.0";
      throw new Error("explore failed");
    });
    vi.mocked(access).mockResolvedValue(undefined);

    const result = await getRelationSummary("/test/project");
    expect(result.status).toBe("failed");
    expect(result.summary).toContain("保守分析");
  });
});

describe("getImpactSummary", () => {
  it("should return missing when codegraph not installed", async () => {
    mockExec(() => { throw new Error("not found"); });
    const result = await getImpactSummary("/test/project", "src/a.ts");
    expect(result.status).toBe("missing");
  });

  it("should try affected then impact as fallback", async () => {
    mockExec((s) => {
      if (s.includes("--version")) return "v1.0.0";
      if (s.includes("affected")) throw new Error("affected failed");
      if (s.includes("impact")) return "impact: 3 files";
      throw new Error("unexpected");
    });
    vi.mocked(access).mockResolvedValue(undefined);

    const result = await getImpactSummary("/test/project", "src/a.ts");
    expect(result.status).toBe("available");
    expect(result.summary).toBe("impact: 3 files");
  });

  it("should return failed when both affected and impact fail", async () => {
    mockExec((s) => {
      if (s.includes("--version")) return "v1.0.0";
      throw new Error("all failed");
    });
    vi.mocked(access).mockResolvedValue(undefined);

    const result = await getImpactSummary("/test/project", "src/a.ts");
    expect(result.status).toBe("failed");
    expect(result.summary).toContain("UA + git diff");
  });
});
