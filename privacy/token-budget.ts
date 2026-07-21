/**
 * Token budget management for LLM context.
 * Limits the amount of text sent to the LLM based on character count.
 */

const DEFAULT_MAX_CHARS = 60000;
const SUMMARY_HEADER = "\n[内容已裁剪，原始长度: {original} 字符]\n";

export function getMaxContextChars(): number {
  const envVal = process.env.EXPLAIN_MAX_CONTEXT_CHARS;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_MAX_CHARS;
}

export interface TrimResult {
  content: string;
  wasTrimmed: boolean;
  originalLength: number;
  trimmedLength: number;
}

/**
 * Trim content to fit within the budget.
 * Prioritizes keeping the beginning (most important) content.
 */
export function trimToBudget(
  content: string,
  maxChars?: number
): TrimResult {
  const limit = maxChars ?? getMaxContextChars();
  const originalLength = content.length;

  if (originalLength <= limit) {
    return { content, wasTrimmed: false, originalLength, trimmedLength: originalLength };
  }

  // Keep first 70% and last 20% when trimming
  const headRatio = 0.7;
  const tailRatio = 0.2;
  const headSize = Math.floor(limit * headRatio);
  const tailSize = Math.floor(limit * tailRatio);

  const head = content.slice(0, headSize);
  const tail = content.slice(originalLength - tailSize);
  const summaryNote = SUMMARY_HEADER.replace("{original}", String(originalLength));
  const trimmed = head + summaryNote + tail;

  return {
    content: trimmed,
    wasTrimmed: true,
    originalLength,
    trimmedLength: trimmed.length,
  };
}

/**
 * Estimate token count from character count (rough estimate: 1 token ≈ 4 chars).
 */
export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

/**
 * Calculate the maximum characters for a section given N sections.
 */
export function budgetPerSection(totalChars: number, sections: number): number {
  if (sections <= 0) return totalChars;
  return Math.floor(totalChars / sections);
}
