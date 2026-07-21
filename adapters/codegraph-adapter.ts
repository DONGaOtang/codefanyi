import { execSync } from "node:child_process";
import { access } from "node:fs/promises";
import { join } from "node:path";

export type CodeGraphSummary = {
  status: "available" | "missing" | "failed";
  summary: string;
  raw?: unknown;
};

function isCodeGraphInstalled(): boolean {
  try {
    execSync("codegraph --version", { stdio: "pipe", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function hasCodeGraphIndex(projectPath: string): Promise<boolean> {
  try {
    await access(join(projectPath, ".codegraph"));
    return true;
  } catch {
    return false;
  }
}

function runCodeGraphCmd(args: string[], projectPath: string): string {
  const cmd = `codegraph ${args.join(" ")}`;
  try {
    const output = execSync(cmd, {
      cwd: projectPath,
      stdio: "pipe",
      timeout: 30000,
      encoding: "utf-8",
    });
    return output.trim();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`CodeGraph 命令执行失败: ${msg}`);
  }
}

export async function getRelationSummary(projectPath: string): Promise<CodeGraphSummary> {
  if (!isCodeGraphInstalled()) {
    return {
      status: "missing",
      summary: "可选增强未启用：安装并运行 codegraph init 后关系分析会更准",
    };
  }

  if (!(await hasCodeGraphIndex(projectPath))) {
    return {
      status: "missing",
      summary: "未找到 CodeGraph 索引，请先运行 codegraph init",
    };
  }

  try {
    const raw = runCodeGraphCmd(["explore", "explain the module relationships"], projectPath);
    return {
      status: "available",
      summary: raw,
      raw,
    };
  } catch {
    return {
      status: "failed",
      summary: "CodeGraph 关系分析失败，将使用 UA 数据做保守分析",
    };
  }
}

export async function getImpactSummary(projectPath: string, filePath: string): Promise<CodeGraphSummary> {
  if (!isCodeGraphInstalled()) {
    return {
      status: "missing",
      summary: "可选增强未启用：安装并运行 codegraph init 后影响分析会更准",
    };
  }

  if (!(await hasCodeGraphIndex(projectPath))) {
    return {
      status: "missing",
      summary: "未找到 CodeGraph 索引，请先运行 codegraph init",
    };
  }

  try {
    // Try affected first, fall back to impact
    const raw = runCodeGraphCmd(["affected", filePath], projectPath);
    return {
      status: "available",
      summary: raw,
      raw,
    };
  } catch {
    try {
      const raw = runCodeGraphCmd(["impact", filePath], projectPath);
      return {
        status: "available",
        summary: raw,
        raw,
      };
    } catch {
      return {
        status: "failed",
        summary: "CodeGraph 影响分析失败，将使用 UA + git diff 做保守分析",
      };
    }
  }
}

export { isCodeGraphInstalled, hasCodeGraphIndex };
