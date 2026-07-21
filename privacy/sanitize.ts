import { join, relative, sep } from "node:path";

export type PrivacyMode = "strict" | "default" | "off";

interface MappingStore {
  getRealPath(alias: string): string;
  registerMapping(real: string, alias: string): void;
}

let mappingStore: MappingStore | null = null;

export function setMappingStore(store: MappingStore): void {
  mappingStore = store;
}

export function sanitizePath(
  absolutePath: string,
  projectPath: string,
  mode: PrivacyMode
): string {
  if (mode === "strict") return "";

  const relPath = relative(projectPath, absolutePath).split(sep).join("/");

  if (mode === "off") return relPath;

  const alias = `file_${hashString(relPath)}`;
  mappingStore?.registerMapping(relPath, alias);
  return alias;
}

export function sanitizeSymbol(name: string, mode: PrivacyMode): string {
  if (mode === "strict") return "";
  if (mode === "off") return name;

  const alias = `symbol_${hashString(name)}`;
  mappingStore?.registerMapping(name, alias);
  return alias;
}

export function sanitizeStructure(
  structure: Record<string, unknown>,
  mode: PrivacyMode
): Record<string, unknown> | null {
  if (mode === "strict") return null;
  if (mode === "off") return structure;
  return anonymizeStructure(structure) as Record<string, unknown>;
}

function anonymizeStructure(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    if (obj.includes("/") || obj.includes("\\")) {
      return `path_${hashString(obj)}`;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(anonymizeStructure);
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (key === "path" || key === "filePath" || key === "absolutePath") {
        result[key] = value ? `path_${hashString(String(value))}` : value;
        continue;
      }
      result[key] = anonymizeStructure(value);
    }
    return result;
  }

  return obj;
}

function hashString(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const chr = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).slice(0, 6);
}

export function canSendToLLM(
  mode: PrivacyMode,
  contentType: "structure" | "path" | "symbol"
): boolean {
  if (mode === "strict") return contentType !== "structure" && contentType !== "path";
  return true;
}
