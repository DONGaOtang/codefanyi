import { execSync } from "node:child_process";

export type GitStatus = {
  available: boolean;
  reason?: string;
};

/**
 * 检测 git 是否在当前目录可用（安装了 git 且目录是 git 仓库）
 */
export function checkGitAvailable(projectPath: string): GitStatus {
  try {
    execSync("git --version", {
      cwd: projectPath,
      stdio: "pipe",
      timeout: 5000,
      encoding: "utf-8",
    });
  } catch {
    return { available: false, reason: "git 未安装或不可用" };
  }

  try {
    execSync("git rev-parse --git-dir", {
      cwd: projectPath,
      stdio: "pipe",
      timeout: 5000,
      encoding: "utf-8",
    });
    return { available: true };
  } catch {
    return { available: false, reason: "当前目录不是 git 仓库" };
  }
}

/**
 * 获取工作区中改动的文件列表（已跟踪但尚未提交或已暂存）
 * 等价于 `git diff --name-only HEAD` + `git diff --cached --name-only HEAD`
 */
export function getChangedFiles(projectPath: string): string[] {
  const status = checkGitAvailable(projectPath);
  if (!status.available) return [];

  try {
    const unstaged = execSync("git diff --name-only HEAD", {
      cwd: projectPath,
      stdio: "pipe",
      timeout: 10000,
      encoding: "utf-8",
    }).trim();

    const staged = execSync("git diff --cached --name-only HEAD", {
      cwd: projectPath,
      stdio: "pipe",
      timeout: 10000,
      encoding: "utf-8",
    }).trim();

    const files = new Set<string>();
    unstaged.split("\n").filter(Boolean).forEach((f) => files.add(f));
    staged.split("\n").filter(Boolean).forEach((f) => files.add(f));
    return [...files];
  } catch {
    return [];
  }
}

/**
 * 获取指定文件的 diff 内容
 * 优先尝试 git diff（工作区改动），再尝试 git show（已提交改动）
 */
export function getFileDiff(projectPath: string, filePath: string): string | null {
  const status = checkGitAvailable(projectPath);
  if (!status.available) return null;

  try {
    const diff = execSync(`git diff -- "${filePath}"`, {
      cwd: projectPath,
      stdio: "pipe",
      timeout: 10000,
      encoding: "utf-8",
    });
    const trimmed = diff.trim();
    if (trimmed) return trimmed;
  } catch {
    /* fall through to git show */
  }

  try {
    const show = execSync(`git show HEAD -- "${filePath}"`, {
      cwd: projectPath,
      stdio: "pipe",
      timeout: 10000,
      encoding: "utf-8",
    });
    return show.trim() || null;
  } catch {
    return null;
  }
}

/**
 * 获取最近的提交日志
 */
export function getRecentLogs(
  projectPath: string,
  count: number = 10
): { hash: string; message: string; author: string; date: string }[] {
  const status = checkGitAvailable(projectPath);
  if (!status.available) return [];

  try {
    const output = execSync(
      `git log --oneline --format="%H|%s|%an|%ad" --date=short -n ${count}`,
      {
        cwd: projectPath,
        stdio: "pipe",
        timeout: 10000,
        encoding: "utf-8",
      }
    );
    return output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, message, author, date] = line.split("|");
        return { hash: hash || "", message: message || "", author: author || "", date: date || "" };
      });
  } catch {
    return [];
  }
}

/**
 * 获取两个 commit 之间的差异文件列表
 */
export function getDiffBetween(
  projectPath: string,
  from: string,
  to: string = "HEAD"
): string[] {
  const status = checkGitAvailable(projectPath);
  if (!status.available) return [];

  try {
    const output = execSync(`git diff --name-only ${from} ${to}`, {
      cwd: projectPath,
      stdio: "pipe",
      timeout: 10000,
      encoding: "utf-8",
    });
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}
