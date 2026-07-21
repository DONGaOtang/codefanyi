/**
 * M6: explain_component - 单模块解释
 */
import { loadUaGraph } from "../adapters/ua-adapter.js";
import { askPlainLanguage, LlmOptions } from "../adapters/llm-adapter.js";
import { sanitizeStructure, PrivacyMode } from "../privacy/sanitize.js";
import { trimToBudget } from "../privacy/token-budget.js";

const COMPONENT_PROMPT = `你是一个代码模块翻译器。请解释以下模块的功能。

要求：
1. "【这个模块干什么】" - 用生活类比
2. "【它和谁有关系】" - 列出关联模块
3. "【改了它会怎样】" - 说明改动影响

模块信息:
{componentData}

请用中文回答。`;

export async function explainComponent(
  projectPath: string,
  moduleName: string,
  options: LlmOptions & { privacyMode?: PrivacyMode } = {}
): Promise<string> {
  const privacyMode = options.privacyMode ?? "default";
  let uaGraph = null;
  try { uaGraph = await loadUaGraph(projectPath); } catch { /* ignore */ }

  const data = uaGraph ? sanitizeStructure(uaGraph, privacyMode) : null;

  if (!options.noLlm && data) {
    try {
      const prompt = COMPONENT_PROMPT.replace("{componentData}", trimToBudget(JSON.stringify({ module: moduleName, graph: data }, null, 2)).content);
      return await askPlainLanguage(prompt, options);
    } catch { /* fall through */ }
  }

  return [
    "【这个模块干什么】",
    `模块 "${moduleName}" 的功能需要结合项目代码分析。`,
    "",
    "【它和谁有关系】",
    "请先运行 Understand Anything 生成项目图谱以查看模块关联。",
    "",
    "【改了它会怎样】",
    "建议使用 explain_impact 工具分析改动影响。",
  ].join("\n");
}
