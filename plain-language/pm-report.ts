/**
 * M10: explain_report - PM视角报告
 */
import { loadUaGraph } from "../adapters/ua-adapter.js";
import { askPlainLanguage, LlmOptions } from "../adapters/llm-adapter.js";
import { sanitizeStructure, PrivacyMode } from "../privacy/sanitize.js";
import { trimToBudget } from "../privacy/token-budget.js";

const REPORT_PROMPT = `你是一个项目管理翻译器。请根据项目信息生成一份给非技术人员看的项目报告。

要求：
1. "【项目概览】" - 项目是什么
2. "【技术健康度】" - 技术栈评价
3. "【进度评估】" - 基于结构的完成度估计
4. "【风险提示】" - 需要注意的问题

项目信息:
{reportData}

请用中文回答。`;

export async function explainReport(
  projectPath: string,
  options: LlmOptions & { privacyMode?: PrivacyMode } = {}
): Promise<string> {
  const privacyMode = options.privacyMode ?? "default";
  let uaGraph = null;
  try { uaGraph = await loadUaGraph(projectPath); } catch { /* ignore */ }

  const data = uaGraph ? sanitizeStructure(uaGraph, privacyMode) : null;

  if (!options.noLlm && data) {
    try {
      const prompt = REPORT_PROMPT.replace("{reportData}", trimToBudget(JSON.stringify(data, null, 2)).content);
      return await askPlainLanguage(prompt, options);
    } catch { /* fall through */ }
  }

  const files = (uaGraph?.files as unknown[]) || [];
  const nodes = (uaGraph?.nodes as unknown[]) || [];

  return [
    "【项目概览】",
    `该项目包含 ${files.length} 个文件，${nodes.length} 个代码模块。`,
    "",
    "【技术健康度】",
    "建议运行 explain_stack 了解详细技术栈。",
    "",
    "【进度评估】",
    "基于文件数量做粗略估计，建议在编辑器中查看实际代码量。",
    "",
    "【风险提示】",
    "此报告基于自动分析生成，可能不完全准确。建议结合人工审查。",
  ].join("\n");
}
