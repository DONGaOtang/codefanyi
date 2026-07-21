import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

const DEFAULT_CACHE_DIR = ".explain-anything/cache";

function getCacheDir(): string {
  return process.env.EXPLAIN_CACHE_DIR ?? DEFAULT_CACHE_DIR;
}

/**
 * Mapping store for sanitized path/symbol aliases.
 * Stores the mapping locally without sending to LLM.
 */
export class MappingStore {
  private store: Map<string, string> = new Map();
  private reverse: Map<string, string> = new Map();
  private dir: string;
  private projectPath: string;
  private loaded = false;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.dir = join(projectPath, getCacheDir());
  }

  async init(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await this.load();
  }

  register(real: string, alias: string): void {
    this.store.set(alias, real);
    this.reverse.set(real, alias);
  }

  resolve(alias: string): string | undefined {
    return this.store.get(alias);
  }

  getAlias(real: string): string | undefined {
    return this.reverse.get(real);
  }

  dump(): Record<string, string> {
    return Object.fromEntries(this.store);
  }

  private async load(): Promise<void> {
    const filePath = join(this.dir, "mapping.json");
    if (!existsSync(filePath)) return;

    try {
      const raw = await readFile(filePath, "utf-8");
      const data = JSON.parse(raw) as Record<string, string>;
      for (const [alias, real] of Object.entries(data)) {
        this.store.set(alias, real);
        this.reverse.set(real, alias);
      }
      this.loaded = true;
    } catch {
      // Ignore load errors; start fresh
    }
  }

  async save(): Promise<void> {
    const filePath = join(this.dir, "mapping.json");
    const data = this.dump();
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

/**
 * Global cache context for tracking what's been cached.
 */
export interface CacheContext {
  mappingStore: MappingStore;
  timestamp: number;
}

export async function createCacheContext(projectPath: string): Promise<CacheContext> {
  const mappingStore = new MappingStore(projectPath);
  await mappingStore.init();
  return { mappingStore, timestamp: Date.now() };
}
