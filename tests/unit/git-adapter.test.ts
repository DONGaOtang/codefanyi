import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock child_process before importing the adapter
const mockExec = vi.fn();
vi.mock("node:child_process", () => ({
  execSync: (...args: unknown[]) => mockExec(...args),
}));

import {
  checkGitAvailable,
  getChangedFiles,
  getFileDiff,
  getRecentLogs,
  getDiffBetween,
} from "../../adapters/git-adapter.js";

// Helper: simulate execSync responses based on command content
function setGitCommandMap(map: Record<string, string | Error>) {
  mockExec.mockImplementation((cmd: string) => {
    for (const [key, result] of Object.entries(map)) {
      if ((cmd as string).includes(key)) {
        if (result instanceof Error) throw result;
        return result;
      }
    }
    throw new Error(`git: unrecognized command: ${cmd}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkGitAvailable", () => {
  it("should return available when git and repo exist", () => {
    setGitCommandMap({
      "git --version": "",
      "git rev-parse --git-dir": ".git",
    });
    const status = checkGitAvailable("/project");
    expect(status.available).toBe(true);
  });

  it("should return unavailable when git is not installed", () => {
    setGitCommandMap({
      "git --version": new Error("command not found"),
    });
    const status = checkGitAvailable("/project");
    expect(status.available).toBe(false);
    expect(status.reason).toContain("未安装");
  });

  it("should return unavailable when not a git repo", () => {
    setGitCommandMap({
      "git --version": "",
      "git rev-parse --git-dir": new Error("not a git repository"),
    });
    const status = checkGitAvailable("/project");
    expect(status.available).toBe(false);
    expect(status.reason).toContain("不是 git 仓库");
  });
});

describe("getChangedFiles", () => {
  it("should return empty array when git is unavailable", () => {
    setGitCommandMap({
      "git --version": new Error("no git"),
    });
    const files = getChangedFiles("/project");
    expect(files).toEqual([]);
  });

  it("should return changed files from both unstaged and staged", () => {
    setGitCommandMap({
      "git --version": "",
      "git rev-parse --git-dir": ".git",
      "git diff --name-only HEAD": "src/a.ts\nsrc/b.ts\n",
      "git diff --cached --name-only HEAD": "src/b.ts\nsrc/c.ts\n",
    });
    const files = getChangedFiles("/project");
    // b.ts appears in both, deduped
    expect(files).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"]);
  });

  it("should handle git diff failure gracefully", () => {
    setGitCommandMap({
      "git --version": "",
      "git rev-parse --git-dir": ".git",
      "git diff --name-only HEAD": new Error("no commits yet"),
      "git diff --cached --name-only HEAD": new Error("no commits yet"),
    });
    const files = getChangedFiles("/project");
    expect(files).toEqual([]);
  });
});

describe("getFileDiff", () => {
  it("should return null when git is unavailable", () => {
    setGitCommandMap({
      "git --version": new Error("no git"),
    });
    const diff = getFileDiff("/project", "src/test.ts");
    expect(diff).toBeNull();
  });

  it("should return working tree diff when available", () => {
    setGitCommandMap({
      "git --version": "",
      "git rev-parse --git-dir": ".git",
      "git diff -- \"src/test.ts\"": "+console.log('changed');\n",
    });
    const diff = getFileDiff("/project", "src/test.ts");
    expect(diff).toContain("console.log");
  });

  it("should fall back to git show when diff is empty", () => {
    setGitCommandMap({
      "git --version": "",
      "git rev-parse --git-dir": ".git",
      "git diff -- \"src/test.ts\"": "",
      "git show HEAD -- \"src/test.ts\"": "+console.log('committed');\n",
    });
    const diff = getFileDiff("/project", "src/test.ts");
    expect(diff).toContain("committed");
  });

  it("should return null when both diff and show fail", () => {
    setGitCommandMap({
      "git --version": "",
      "git rev-parse --git-dir": ".git",
      "git diff -- \"src/test.ts\"": new Error("fatal"),
      "git show HEAD -- \"src/test.ts\"": new Error("fatal"),
    });
    const diff = getFileDiff("/project", "src/test.ts");
    expect(diff).toBeNull();
  });
});

describe("getRecentLogs", () => {
  it("should return empty array when git is unavailable", () => {
    setGitCommandMap({
      "git --version": new Error("no git"),
    });
    const logs = getRecentLogs("/project");
    expect(logs).toEqual([]);
  });

  it("should return parsed log entries", () => {
    setGitCommandMap({
      "git --version": "",
      "git rev-parse --git-dir": ".git",
      "git log --oneline": "abc123|fix: bug|Alice|2024-01-15\ndef456|feat: feature|Bob|2024-01-14\n",
    });
    const logs = getRecentLogs("/project", 5);
    expect(logs).toHaveLength(2);
    expect(logs[0]).toEqual({
      hash: "abc123",
      message: "fix: bug",
      author: "Alice",
      date: "2024-01-15",
    });
    expect(logs[1].hash).toBe("def456");
  });
});

describe("getDiffBetween", () => {
  it("should return empty array when git is unavailable", () => {
    setGitCommandMap({
      "git --version": new Error("no git"),
    });
    const files = getDiffBetween("/project", "HEAD~3", "HEAD");
    expect(files).toEqual([]);
  });

  it("should return file list between two refs", () => {
    setGitCommandMap({
      "git --version": "",
      "git rev-parse --git-dir": ".git",
      "git diff --name-only HEAD~1 HEAD": "src/a.ts\nsrc/b.ts\n",
    });
    const files = getDiffBetween("/project", "HEAD~1", "HEAD");
    expect(files).toEqual(["src/a.ts", "src/b.ts"]);
  });
});
