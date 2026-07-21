import { loadUaGraph } from "../adapters/ua-adapter.js";
import { askPlainLanguage, LlmOptions } from "../adapters/llm-adapter.js";
import { sanitizeStructure, PrivacyMode } from "../privacy/sanitize.js";
import { trimToBudget } from "../privacy/token-budget.js";

export interface ProjectOverview {
  summary: string;
  components: string[];
  notes: string;
}

const PROJECT_PROMPT = `你是一个代码项目翻译器。请把以下项目结构信息翻译成非技术人员能看懂的大白话。

要求：
1. 用"【这个项目是什么】"开头，用一两句话概括项目
2. 用"【它由哪几部分组成】"列出主要模块，用生活类比
3. 用"【需要注意的】"指出你可能不确定或有风险的地方

项目信息：
{projectData}

请用中文回答。`;

export async function explainProject(
  projectPath: string,
  options: LlmOptions & { privacyMode?: PrivacyMode } = {}
): Promise<string> {
  const privacyMode = options.privacyMode ?? "default";

  // Try UA graph first
  let uaGraph: Record<string, unknown> | null = null;
  try {
    uaGraph = await loadUaGraph(projectPath);
  } catch {
    // UA not available, continue without it
  }

  const sanitized = uaGraph ? sanitizeStructure(uaGraph, privacyMode) : null;

  if (!options.noLlm && sanitized) {
    try {
      const prompt = PROJECT_PROMPT.replace(
        "{projectData}",
        trimToBudget(JSON.stringify(sanitized, null, 2)).content
      );
      return await askPlainLanguage(prompt, options);
    } catch {
      // Fall through to local
    }
  }

  // Local fallback
  return localProjectExplain(uaGraph);
}

function localProjectExplain(graph: Record<string, unknown> | null): string {
  if (!graph) {
    return [
      "【这个项目是什么】",
      "无法获取项目结构信息。请先运行 Understand Anything 生成项目图谱。",
      "",
      "【它由哪几部分组成】",
      "未知（缺少项目图谱）",
      "",
      "【需要注意的】",
      "没有图谱数据，无法提供分析。请执行以下步骤：",
      "1. 安装 Understand Anything",
      "2. 运行 /understand 命令生成 .ua/knowledge-graph.json",
    ].join("\n");
  }

  const files = (graph.files as unknown[]) || [];
  const nodes = (graph.nodes as unknown[]) || [];
  const domains = (graph.domains as unknown[]) || [];

  return [
    "【这个项目是什么】",
    `该项目包含 ${files.length} 个文件和 ${nodes.length} 个代码模块。`,
    "",
    "【它由哪几部分组成】",
    domains.length > 0
      ? (domains as Array<{ name: string }>).map((d) => `  • ${d.name}`).join("\n")
      : "未检测到清晰的模块划分",
    "",
    "【需要注意的】",
    "这是基于本地图谱的自动分析，可能不完全准确。",
    "建议在编辑器中查看完整项目结构。",
  ].join("\n");
}
