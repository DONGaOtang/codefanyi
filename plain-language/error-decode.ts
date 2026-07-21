import { askPlainLanguage, LlmOptions } from "../adapters/llm-adapter.js";
import { trimToBudget } from "../privacy/token-budget.js";

export interface ErrorExplanation {
  whatItSays: string;
  whyItHappens: string;
  whatToDo: string;
  risks: string;
  originalTerms: string;
}

const ERROR_PROMPT = `你是一个代码报错翻译器。请把以下报错信息翻译成非技术人员能看懂的大白话。

要求：
1. 用"【它在说什么】"开头，用生活类比解释这个报错
2. 用"【为什么会这样】"解释常见原因
3. 用"【你现在该干嘛】"给出具体步骤
4. 用"【风险】"说明如果不处理的后果
5. 用"【术语对照】"列出报错中出现的英文术语及其中文含义

报错信息：
{errorMessage}

请用中文回答。`;

export async function explainError(
  errorMessage: string,
  options: LlmOptions = {}
): Promise<string> {
  // Phase 1: try LLM
  if (!options.noLlm) {
    try {
      const prompt = ERROR_PROMPT.replace("{errorMessage}", trimToBudget(errorMessage).content);
      return await askPlainLanguage(prompt, options);
    } catch {
      // Fall through to local explanation
    }
  }

  // Phase 2: local pattern-based explanation
  return localErrorExplain(errorMessage);
}

function localErrorExplain(message: string): string {
  let what = "这是一条程序报错信息。";
  let why = "";
  let todo = "1. 仔细阅读报错信息中的文件名和行号\n2. 检查该位置的代码逻辑\n3. 搜索相关技术文档";
  let risks = "如果不处理，程序可能无法正常运行或产生错误结果。";
  const terms: string[] = [];

  if (message.includes("Cannot read properties of undefined") || message.includes("is not defined")) {
    what = "程序想从一个\"空盒子\"里拿东西，但那个盒子根本不存在。就像你打开抽屉找文件，但抽屉是空的。";
    why = "某个变量或数据在使用前没有被正确赋值或加载。";
    todo = "1. 找到报错提到的变量\n2. 在使用前检查该变量是否为空\n3. 添加默认值或条件判断";
    terms.push("undefined -> 未定义/没有值");
    terms.push("properties -> 属性/字段");
  } else if (message.includes("TypeError")) {
    what = "程序拿到的东西类型不对。就像你想用钥匙开门，但手里拿的是一支笔。";
    why = "对某个值执行了它不支持的操作（比如对数字调用字符串方法）。";
    todo = "1. 确认报错位置的变量类型\n2. 检查是否需要类型转换\n3. 添加类型检查";
    terms.push("TypeError -> 类型错误");
  } else if (message.includes("SyntaxError")) {
    what = "程序读不懂你写的代码，就像一句话缺了标点或写错了字。";
    why = "代码中有语法错误，比如缺少括号、引号不匹配、关键字拼写错误。";
    todo = "1. 检查报错位置附近的括号是否配对\n2. 检查引号是否正确闭合\n3. 检查分号/逗号是否正确";
    terms.push("SyntaxError -> 语法错误");
  } else if (message.includes("timeout") || message.includes("TIMEOUT")) {
    what = "程序等了太久没等到回应，就像打电话一直没人接。";
    why = "网络请求超时、数据库查询太慢、或者某个操作卡住了。";
    todo = "1. 检查网络连接\n2. 检查目标服务是否正常运行\n3. 考虑增加超时时间或添加重试";
    terms.push("timeout -> 超时/等待太久");
  }

  if (message.includes("ReferenceError")) terms.push("ReferenceError -> 引用错误（用了不存在的东西）");
  if (message.includes("RangeError")) terms.push("RangeError -> 范围错误（数字超出允许范围）");

  return [
    "【它在说什么】",
    what,
    "",
    "【为什么会这样】",
    why || "可能是代码逻辑问题或环境配置问题。",
    "",
    "【你现在该干嘛】",
    todo,
    "",
    "【风险】",
    risks,
    "",
    "【术语对照】",
    terms.length > 0 ? terms.join("\n") : "请复制报错原文搜索相关文档。",
  ].join("\n");
}
