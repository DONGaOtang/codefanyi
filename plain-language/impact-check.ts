import { loadUaGraph } from "../adapters/ua-adapter.js";
import { getImpactSummary } from "../adapters/codegraph-adapter.js";
import { askPlainLanguage, LlmOptions } from "../adapters/llm-adapter.js";
import { sanitizePath, sanitizeStructure, PrivacyMode } from "../privacy/sanitize.js";
import { trimToBudget } from "../privacy/token-budget.js";
import { getChangedFiles } from "../adapters/git-adapter.js";

const IMPACT_PROMPT = `你是一个代码改动分析器。请分析以下改动对项目的影响，用非技术人员能看懂的语言说明。

要求：
1. 用"【你改的东西】"说明改了什么
2. 用"【直接影响】"列出直接影响的功能
3. 用"【可能影响】"列出间接影响
4. 用"【建议】"给出测试建议

改动信息：
{impactData}

请用中文回答。`;

export async function explainImpact(
  projectPath: string,
  filePath: string,
  options: LlmOptions & { privacyMode?: PrivacyMode } = {}
): Promise<string> {
  const privacyMode = options.privacyMode ?? "default";
  const relativePath = sanitizePath(filePath, projectPath, privacyMode);

  // Get changed files via git-adapter
  const gitChanged: string[] = getChangedFiles(projectPath);

  // Get UA and CodeGraph data
  let uaGraph = null;
  try { uaGraph = await loadUaGraph(projectPath); } catch { /* ignore */ }

  const cgSummary = await getImpactSummary(projectPath, filePath);

  const combined = {
    changedFile: privacyMode === "off" ? relativePath : (relativePath || "未知文件"),
    gitChanged: privacyMode === "strict" ? [] : gitChanged,
    ua: uaGraph ? sanitizeStructure(uaGraph, privacyMode) : null,
    codegraph: cgSummary,
  };

  if (!options.noLlm) {
    try {
      const prompt = IMPACT_PROMPT.replace(
        "{impactData}",
        trimToBudget(JSON.stringify(combined, null, 2)).content
      );
      return await askPlainLanguage(prompt, options);
    } catch { /* fall through */ }
  }

  return localImpactExplain(filePath, gitChanged, cgSummary);
}

function localImpactExplain(
  filePath: string,
  gitChanged: string[],
  cgSummary: { status: string; summary: string }
): string {
  const changed = gitChanged.length > 0 ? gitChanged : [filePath];

  return [
    "【你改的东西】",
    `你修改了以下文件：`,
    ...changed.map((f) => `  • ${f}`),
    "",
    "【直接影响】",
    "修改的文件直接影响与其相关的功能模块。",
    cgSummary.status === "available" ? `CodeGraph分析：${cgSummary.summary}` : "",
    "",
    "【可能影响】",
    "改动可能影响依赖该文件的其他模块。建议检查项目中的导入关系。",
    "",
    "【建议】",
    "改完后建议测试以下场景：",
    "1. 受影响页面的基本功能",
    "2. 关联模块的核心流程",
    "3. 边界情况和错误处理",
  ].join("\n");
}
