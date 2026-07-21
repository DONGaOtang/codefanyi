import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadUaGraph } from "../../adapters/ua-adapter.js";

let testDir: string;

beforeEach(async () => {
  // Create a unique temp directory for each test
  testDir = join(tmpdir(), `ua-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  // Clean up
  await rm(testDir, { recursive: true, force: true });
});

const validGraph = {
  files: [
    { path: "src/index.ts", type: "entry", summary: "入口" },
  ],
  nodes: [{ id: "n1", name: "App", type: "entry" }],
  edges: [{ from: "n1", to: "n2", relation: "imports" }],
};

describe("loadUaGraph", () => {
  it("should load graph from .ua/knowledge-graph.json", async () => {
    const uaDir = join(testDir, ".ua");
    await mkdir(uaDir);
    await writeFile(join(uaDir, "knowledge-graph.json"), JSON.stringify(validGraph));

    const result = await loadUaGraph(testDir);
    expect(result.files).toHaveLength(1);
    expect(result.nodes).toHaveLength(1);
  });

  it("should fallback to .understand-anything/knowledge-graph.json", async () => {
    const oldDir = join(testDir, ".understand-anything");
    await mkdir(oldDir);
    await writeFile(join(oldDir, "knowledge-graph.json"), JSON.stringify(validGraph));

    const result = await loadUaGraph(testDir);
    expect(result.files).toHaveLength(1);
  });

  it("should prefer .ua/ over .understand-anything/", async () => {
    const uaDir = join(testDir, ".ua");
    await mkdir(uaDir);
    await writeFile(join(uaDir, "knowledge-graph.json"), JSON.stringify({ ...validGraph, files: [{ path: "a.ts", type: "entry", summary: "from ua" }] }));

    const oldDir = join(testDir, ".understand-anything");
    await mkdir(oldDir);
    await writeFile(join(oldDir, "knowledge-graph.json"), JSON.stringify({ ...validGraph, files: [{ path: "b.ts", type: "entry", summary: "from old" }] }));

    const result = await loadUaGraph(testDir);
    expect(result.files![0] as Record<string, unknown>).toHaveProperty("summary", "from ua");
  });

  it("should throw when no graph exists", async () => {
    await expect(loadUaGraph(testDir)).rejects.toThrow("请先运行 Understand Anything 生成项目图谱");
  });

  it("should throw when JSON is corrupted", async () => {
    const uaDir = join(testDir, ".ua");
    await mkdir(uaDir);
    await writeFile(join(uaDir, "knowledge-graph.json"), "{ broken json ////");

    await expect(loadUaGraph(testDir)).rejects.toThrow("项目图谱文件格式错误，请重新生成");
  });

  it("should throw when graph file is empty", async () => {
    const uaDir = join(testDir, ".ua");
    await mkdir(uaDir);
    await writeFile(join(uaDir, "knowledge-graph.json"), "");

    await expect(loadUaGraph(testDir)).rejects.toThrow("图谱文件为空，请重新生成");
  });
});
