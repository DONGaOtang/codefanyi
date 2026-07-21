# Explain Anything

把代码项目翻译成非技术人员看得懂的大白话。

## 这是什么

Explain Anything 是一个本地工具，能把项目结构、报错信息、用户流程、代码改动影响翻译成通俗易懂的中文解释。它提供了 MCP Server 和 CLI 两种使用方式。

## 谁需要用这个

- 用 AI 写代码但看不懂项目全貌的人
- 产品经理
- 非技术创始人
- 设计师
- 需要快速理解项目的运营、测试、交付人员

## 快速开始

### 1. 安装

```bash
git clone <your-repo-url>
cd explain-anything
pnpm install
pnpm run build
```

### 2. 配置

复制环境变量文件并填入你的 Anthropic API Key：

```bash
cp .env.example .env
# 编辑 .env，设置 ANTHROPIC_API_KEY=你的key
```

### 3. 使用

#### CLI 模式

```bash
# 解释报错
explain-anything error "TypeError: Cannot read properties of undefined"

# 查看项目结构
explain-anything project ./my-app --no-llm

# 分析模块关系
explain-anything relation ./my-app

# 分析改动影响
explain-anything impact ./my-app src/login.ts

# 解释用户操作流程
explain-anything flow ./my-app --no-llm

# 生成PM报告
explain-anything report ./my-app --no-llm
```

#### MCP Server 模式

在 Qoder/Claude Desktop 等 MCP 客户端中添加：

```json
{
  "mcpServers": {
    "explain-anything": {
      "command": "node",
      "args": ["path/to/explain-anything/dist/server/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "你的key",
        "PRIVACY_MODE": "default"
      }
    }
  }
}
```

## 核心能力

| 模块 | MCP 工具 | CLI 命令 | 作用 |
|------|----------|----------|------|
| M3 | explain_project | project | 项目大白话概览 |
| M5 | explain_flow | flow | 用户操作路径和页面跳转 |
| M7 | explain_relation | relation | 模块关系说明 |
| M8 | explain_error | error | 报错翻译成大白话 |
| M9 | explain_impact | impact | 改动影响范围分析 |
| M10 | explain_report | report | PM视角项目报告 |

## 隐私说明

Explain Anything 默认保护你的代码隐私：

- **default 模式**（默认）：只发送脱敏后的结构摘要，不发送真实路径和完整源代码
- **strict 模式**：不发送任何项目结构信息
- **off 模式**：发送必要的文件名和行号（用户主动开启）
- **--no-llm 模式**：完全不调用外部 API，只输出本地 JSON 摘要

## 上游工具说明

Explain Anything 集成了以下开源工具：

- **Understand Anything**：用于生成项目知识图谱（`.ua/knowledge-graph.json`）。运行 UA 的 `/understand` 命令时可能会调用外部模型并消耗 token，这部分不由 Explain Anything 控制。敏感项目请先配置 UA 使用本地模型。
- **CodeGraph**：可选的代码索引工具。安装并运行 `codegraph init` 后，关系分析和影响分析会更准确。不安装也能正常使用。

## 环境要求

- Node.js >= 22.0.0
- pnpm

## 开发

```bash
pnpm install
pnpm run typecheck
pnpm test
pnpm run build
```

## 许可

MIT License。详见 LICENSE 文件。
