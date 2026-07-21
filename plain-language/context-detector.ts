/**
 * M2: explain_stack - 翻译技术栈
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { askPlainLanguage, LlmOptions } from "../adapters/llm-adapter.js";

export interface StackInfo {
  name: string;
  runtime: string;
  framework: string;
  packageManager: string;
  dependencies: string[];
  devDependencies: string[];
}

const STACK_PROMPT = `你是一个技术栈翻译器。把以下项目配置翻译成大白话。

要求：
1. "【用的什么技术】" - 用通俗语言解释每项技术是干嘛的
2. "【为什么选这些】" - 解释这些技术的典型使用场景
3. "【对业务的意义】" - 说明技术选型对项目的影响

项目配置:
{configData}

请用中文回答。`;

export async function explainStack(
  projectPath: string,
  options: LlmOptions = {}
): Promise<string> {
  let stackInfo: StackInfo | null = null;

  try {
    const pkgRaw = await readFile(join(projectPath, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw);

    stackInfo = {
      name: pkg.name || "未知项目",
      runtime: `Node.js ${pkg.engines?.node || "未知"}`,
      framework: detectFramework(pkg),
      packageManager: pkg.packageManager || "npm/pnpm",
      dependencies: Object.keys(pkg.dependencies || {}),
      devDependencies: Object.keys(pkg.devDependencies || {}),
    };
  } catch {
    // no package.json
  }

  if (!stackInfo) {
    return "未找到 package.json，无法分析技术栈。";
  }

  const configData = JSON.stringify(stackInfo, null, 2);

  if (!options.noLlm) {
    try {
      const prompt = STACK_PROMPT.replace("{configData}", configData);
      return await askPlainLanguage(prompt, options);
    } catch { /* fall through */ }
  }

  return localStackExplain(stackInfo);
}

function detectFramework(pkg: Record<string, unknown>): string {
  const all = { ...(pkg.dependencies as Record<string, string> || {}), ...(pkg.devDependencies as Record<string, string> || {}) };
  const keys = Object.keys(all);

  if (keys.includes("next")) return "Next.js";
  if (keys.includes("react")) return "React";
  if (keys.includes("vue")) return "Vue.js";
  if (keys.includes("@angular/core")) return "Angular";
  if (keys.includes("express")) return "Express.js";
  if (keys.includes("nestjs") || keys.includes("@nestjs/core")) return "NestJS";

  return "未检测到主流框架";
}

function localStackExplain(info: StackInfo): string {
  const depNames: Record<string, string> = {
    "@anthropic-ai/sdk": "Anthropic AI 接口",
    "@modelcontextprotocol/sdk": "MCP 协议支持",
    react: "React 前端框架",
    vue: "Vue.js 前端框架",
    express: "Express 后端框架",
    typescript: "TypeScript 类型检查",
    vitest: "Vitest 测试框架",
    vite: "Vite 构建工具",
  };

  const depsExplained = info.dependencies
    .map((d) => `  • ${d} — ${depNames[d] || "通用依赖"}`)
    .join("\n");

  return [
    "【用的什么技术】",
    `项目名：${info.name}`,
    `运行环境：${info.runtime}`,
    `主要框架：${info.framework}`,
    "",
    "【依赖清单】",
    depsExplained || "无",
    "",
    "【对业务的意义】",
    `使用 ${info.framework || "Node.js"} 构建，适合${info.framework === "Next.js" ? "全栈 Web 应用" : "服务端/工具类项目"}。`,
    `共 ${info.dependencies.length} 个生产依赖，${info.devDependencies.length} 个开发依赖。`,
  ].join("\n");
}
