import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type UaGraph = {
  files?: unknown[];
  nodes?: unknown[];
  edges?: unknown[];
  domains?: unknown[];
  [key: string]: unknown;
};

const NEW_GRAPH_PATH = ".ua/knowledge-graph.json";
const OLD_GRAPH_PATH = ".understand-anything/knowledge-graph.json";

export async function loadUaGraph(projectPath: string): Promise<UaGraph> {
  const newPath = join(projectPath, NEW_GRAPH_PATH);
  const oldPath = join(projectPath, OLD_GRAPH_PATH);

  // Try new path first, then old path
  for (const filePath of [newPath, oldPath]) {
    try {
      const raw = await readFile(filePath, "utf-8");
      if (raw.trim().length === 0) {
        throw new Error("图谱文件为空，请重新生成");
      }
      const parsed = JSON.parse(raw) as UaGraph;
      return parsed;
    } catch (err: unknown) {
      if (isFileNotFound(err)) {
        continue; // try next path
      }
      if (err instanceof SyntaxError) {
        throw new Error("项目图谱文件格式错误，请重新生成");
      }
      throw err;
    }
  }

  throw new Error("请先运行 Understand Anything 生成项目图谱");
}

function isFileNotFound(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    return (err as NodeJS.ErrnoException).code === "ENOENT";
  }
  return false;
}
