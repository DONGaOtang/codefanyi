# Explain Anything · 发现记录 (findings.md)

> 最后更新: 2026-07-21

---

## 环境发现

| 发现项 | 详情 | 状态 |
|--------|------|------|
| Node.js | v24.16.0, 路径 C:\Program Files\nodejs\ | ✅ >=22 |
| pnpm | v11.15.1, 通过 npm install -g pnpm 安装 | ✅ |
| TypeScript | v5.5.2, 通过 pnpm install 安装到项目 | ✅ |
| codegraph | 未安装, V1可选增强 | ⚠️ 待 Phase 2 |
| Git | v2.54.0, 路径 D:\Git\cmd | ✅ |
| OS | Windows 11 专业版 2009, 64位 | ✅ |

## 架构约束

- 所有上游读取走 adapters/
- 所有 LLM 调用走 adapters/llm-adapter.ts
- 所有脱敏走 privacy/sanitize.ts
- plain-language/ 不直接读数据库、不直接调 execSync、不直接调 Anthropic SDK
- MCP 工具不使用 dbPath 作为用户参数
- V1 仅支持 Anthropic API
- 默认不发送真实路径和完整源代码给 LLM

## esbuild 构建脚本

- pnpm v11 默认阻止 esbuild postinstall 脚本
- 解决: pnpm approve-builds esbuild
- 已处理 ✅
