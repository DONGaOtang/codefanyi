/**
 * M1: explain_input - 判断用户给的是项目、文件、报错、改动说明
 */
export type InputType = "error" | "project" | "file" | "diff" | "unknown";

export interface InputResult {
  type: InputType;
  confidence: number;
  reason: string;
}

export function detectInput(input: string): InputResult {
  // Error patterns
  const errorPatterns = [
    /TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError/i,
    /\w+Error:/,
    /Cannot read properties of/i,
    /is not defined/,
    /^\s*at\s+/m,
    /^\w+\.\w+:\d+:\d+\)?$/m,
    /stack trace/i,
    /Uncaught/i,
    /Unhandled/i,
  ];

  const isError = errorPatterns.some((p) => p.test(input));
  if (isError) {
    return { type: "error", confidence: 0.9, reason: "输入匹配常见报错格式" };
  }

  // Diff patterns
  const diffPatterns = [/^diff --git/m, /^@@.*@@/m, /^--- a\//m, /^\+\+\+ b\//m, /^\+\s/m, /^-\s/m];
  const isDiff = diffPatterns.filter((p) => p.test(input)).length >= 2;
  if (isDiff) {
    return { type: "diff", confidence: 0.85, reason: "输入匹配 git diff 格式" };
  }

  // Project path patterns
  const pathPatterns = [/^(\/|[A-Za-z]:\\)/, /^\.\//, /^\.\.\//, /package\.json$/];
  if (pathPatterns.some((p) => p.test(input.trim()))) {
    return { type: "project", confidence: 0.7, reason: "输入看起来是文件路径" };
  }

  // Short non-error text -> unknown
  if (input.trim().length < 20) {
    return { type: "unknown", confidence: 0.3, reason: "输入太短，无法判断" };
  }

  return { type: "unknown", confidence: 0.3, reason: "无法识别输入类型" };
}
