/**
 * M4: explain_business - 业务逻辑解释
 */
import { loadUaGraph } from "../adapters/ua-adapter.js";
import { askPlainLanguage, LlmOptions } from "../adapters/llm-adapter.js";
import { sanitizeStructure, PrivacyMode } from "../privacy/sanitize.js";
import { trimToBudget } from "../privacy/token-budget.js";

const BUSINESS_PROMPT = `你是一个业务逻辑翻译器。根据项目结构信息，用大白话解释项目的业务逻辑。

要求：
1. "【这个项目做什么生意】" - 用一句话概括业务
2. "【核心业务流程】" - 用生活类比描述主流程
3. "【关键角色和数据】" - 列出主要用户角色和数据类型

项目信息:
{businessData}

请用中文回答。`;

export async function explainBusiness(
  projectPath: string,
  options: LlmOptions & { privacyMode?: PrivacyMode } = {}
): Promise<string> {
  const privacyMode = options.privacyMode ?? "default";
  let uaGraph = null;
  try { uaGraph = await loadUaGraph(projectPath); } catch { /* ignore */ }

  const data = uaGraph ? sanitizeStructure(uaGraph, privacyMode) : null;

  if (!options.noLlm && data) {
    try {
      const prompt = BUSINESS_PROMPT.replace("{businessData}", trimToBudget(JSON.stringify(data, null, 2)).content);
      return await askPlainLanguage(prompt, options);
    } catch { /* fall through */ }
  }

  if (!data) {
    return "未找到项目图谱，无法分析业务逻辑。请先运行 Understand Anything 生成 .ua/knowledge-graph.json。";
  }

  const domains = (uaGraph?.domains as Array<{ name: string; nodes: string[] }>) || [];
  return [
    "【这个项目做什么生意】",
    `项目包含 ${domains.length} 个业务域。`,
    "",
    "【核心业务流程】",
    domains.map((d) => `  • ${d.name} 域：涉及 ${d.nodes.length} 个模块`).join("\n") || "未检测到明确的业务域划分",
    "",
    "【关键角色和数据】",
    "建议在编辑器中查看完整代码以了解详细业务逻辑。",
  ].join("\n");
}
