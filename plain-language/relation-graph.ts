import { loadUaGraph } from "../adapters/ua-adapter.js";
import { getRelationSummary } from "../adapters/codegraph-adapter.js";
import { askPlainLanguage, LlmOptions } from "../adapters/llm-adapter.js";
import { sanitizeStructure, PrivacyMode } from "../privacy/sanitize.js";
import { trimToBudget } from "../privacy/token-budget.js";

const RELATION_PROMPT = `你是一个代码架构翻译器。请把以下模块关系信息翻译成非技术人员能看懂的关系图。

要求：
1. 用"【整体关系】"概括模块之间的依赖关系
2. 用"【关键连接】"列出最重要的模块关系
3. 用"【风险评估】"指出哪些模块改动影响最大

模块关系数据：
{relationData}

请用中文回答。`;

export async function explainRelation(
  projectPath: string,
  options: LlmOptions & { privacyMode?: PrivacyMode } = {}
): Promise<string> {
  const privacyMode = options.privacyMode ?? "default";

  // Get UA graph for relations
  let uaGraph = null;
  try { uaGraph = await loadUaGraph(projectPath); } catch { /* ignore */ }

  // Get CodeGraph summary (may degrade)
  const cgSummary = await getRelationSummary(projectPath);

  const combined = {
    ua: uaGraph ? sanitizeStructure(uaGraph, privacyMode) : null,
    codegraph: cgSummary,
  };

  if (!options.noLlm) {
    try {
      const prompt = RELATION_PROMPT.replace(
        "{relationData}",
        trimToBudget(JSON.stringify(combined, null, 2)).content
      );
      return await askPlainLanguage(prompt, options);
    } catch { /* fall through */ }
  }

  // Local fallback
  return localRelationExplain(uaGraph, cgSummary);
}

function localRelationExplain(
  graph: Record<string, unknown> | null,
  cgSummary: { status: string; summary: string }
): string {
  const edges = (graph?.edges as unknown[]) || [];
  const nodes = (graph?.nodes as unknown[]) || [];

  return [
    "【整体关系】",
    `检测到 ${nodes.length} 个模块和 ${edges.length} 个关联关系。`,
    cgSummary.status === "available" ? `CodeGraph补充：${cgSummary.summary}` : "",
    "",
    "【关键连接】",
    edges.length > 0
      ? edges.map((e: unknown) => {
          const edge = e as Record<string, unknown>;
          return `  • ${edge["from"]} → ${edge["to"]} (${edge["relation"] || "关联"})`;
        }).join("\n")
      : "未检测到明确的模块关联",
    "",
    "【风险评估】",
    edges.length > 0 ? "被最多模块依赖的节点改动影响最大，请重点关注。" : "数据不足，无法评估。",
  ].join("\n");
}
