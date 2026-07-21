/**
 * M5: explain_flow - 用户操作路径
 */
import { loadUaGraph } from "../adapters/ua-adapter.js";
import { askPlainLanguage, LlmOptions } from "../adapters/llm-adapter.js";
import { sanitizeStructure, PrivacyMode } from "../privacy/sanitize.js";
import { trimToBudget } from "../privacy/token-budget.js";

const FLOW_PROMPT = `你是一个用户流程翻译器。根据项目结构，描述用户使用这个应用时的操作路径。

要求：
1. "【用户从哪里开始】" - 描述入口
2. "【核心操作流程】" - 列出主要操作步骤
3. "【页面之间的跳转】" - 描述页面关系

项目信息:
{flowData}

请用中文回答。`;

export async function explainFlow(
  projectPath: string,
  options: LlmOptions & { privacyMode?: PrivacyMode } = {}
): Promise<string> {
  const privacyMode = options.privacyMode ?? "default";
  let uaGraph = null;
  try { uaGraph = await loadUaGraph(projectPath); } catch { /* ignore */ }

  const data = uaGraph ? sanitizeStructure(uaGraph, privacyMode) : null;

  if (!options.noLlm && data) {
    try {
      const prompt = FLOW_PROMPT.replace("{flowData}", trimToBudget(JSON.stringify(data, null, 2)).content);
      return await askPlainLanguage(prompt, options);
    } catch { /* fall through */ }
  }

  const nodes = (uaGraph?.nodes as unknown[]) || [];
  const edges = (uaGraph?.edges as unknown[]) || [];

  return [
    "【用户从哪里开始】",
    nodes.length > 0 ? `项目有 ${nodes.length} 个组件/页面` : "无法确定入口",
    "",
    "【核心操作流程】",
    edges.length > 0
      ? (edges as Array<{ from: string; to: string; relation: string }>)
          .map((e) => `  • ${e.from} → ${e.to} (${e.relation})`)
          .join("\n")
      : "未检测到流程信息。运行 UA 和 CodeGraph 后分析会更准确。",
    "",
    "【页面之间的跳转】",
    "需要项目运行时才能完整了解跳转逻辑。",
  ].join("\n");
}
