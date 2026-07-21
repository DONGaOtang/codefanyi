# Explain Anything · 任务计划 (task_plan.md)

> 基于文档: 11_完整执行方案_合并版.md (V4收敛版)
> 最后更新: 2026-07-21
> 项目路径: c:\Users\Administrator\Desktop\explain-anything

---

## Phase 0: 环境准备与项目骨架 ✅ 已完成

| 检查项 | 状态 |
|--------|------|
| pnpm v11.15.1 已安装 | ✅ |
| 目录结构 (13个目录) | ✅ |
| package.json / tsconfig.json / .env.example / .gitignore | ✅ |
| git init + pnpm install (187 包) | ✅ |
| pnpm run typecheck 可运行 | ✅ |

---

## Phase 1: 接入 Understand Anything (UA适配层)

**入口条件**: Phase 0 完成
**任务目标**: 实现 ua-adapter.ts，能读取 UA 生成的知识图谱 JSON
**依赖**: 无外部 Phase 依赖

### 任务清单

| ID | 任务 | 产出物 | 验收 |
|----|------|--------|------|
| 1.1 | 实现 `adapters/ua-adapter.ts` | ua-adapter.ts | 按文档代码模板 |
| 1.2 | 支持读取 `.ua/knowledge-graph.json` | ua-adapter.ts | 文件存在时正确解析 |
| 1.3 | 支持读取旧路径 `.understand-anything/knowledge-graph.json` | ua-adapter.ts | 兼容旧目录 |
| 1.4 | 编写单元测试 `tests/unit/ua-adapter.test.ts` | ua-adapter.test.ts | 3个场景: 正常/不存在/JSON损坏 |
| 1.5 | 创建测试固件 `tests/fixtures/ua-valid.json` 和 `tests/fixtures/ua-corrupt.json` | fixtures/ | JSON示例数据 |
| 1.6 | 运行 `pnpm test` 确保 UA 测试通过 | - | 全部 PASS |
| 1.7 | 运行 `pnpm run typecheck` | - | 无 TS 错误 |

### 验收清单 (文档第372-378行)

- [ ] `.ua/knowledge-graph.json` 存在时能读取
- [ ] `.understand-anything/knowledge-graph.json` 存在时能读取
- [ ] 两者都不存在时提示运行 UA
- [ ] JSON 损坏时提示重新生成
- [ ] README 说明 UA 模型调用不由 Explain Anything 控制

---

## Phase 2: 接入 CodeGraph (CodeGraph适配层)

**入口条件**: Phase 1 完成
**任务目标**: 实现 codegraph-adapter.ts，通过 CLI 获取关系/影响摘要
**依赖**: Phase 1

### 任务清单

| ID | 任务 | 产出物 | 验收 |
|----|------|--------|------|
| 2.1 | 实现 `adapters/codegraph-adapter.ts` | codegraph-adapter.ts | 按文档代码模板 |
| 2.2 | 实现 `getRelationSummary()` | codegraph-adapter.ts | 调用 codegraph explore |
| 2.3 | 实现 `getImpactSummary()` | codegraph-adapter.ts | 调用 codegraph affected/impact |
| 2.4 | CodeGraph 不可用时降级 (不崩溃) | codegraph-adapter.ts | 返回 status=missing/failed |
| 2.5 | 实现 `scripts/setup.ts` 检测 codegraph 命令 | setup.ts | 提示安装方式 |
| 2.6 | 编写单元测试 `tests/unit/codegraph-adapter.test.ts` | test | 可用/不可用/命令不存在 |
| 2.7 | 运行 typecheck + test | - | 通过 |

### 验收清单 (文档第409-415行)

- [ ] CodeGraph 存在时返回摘要
- [ ] CodeGraph 不存在时 M7/M9 降级不崩溃
- [ ] 不出现未捕获异常
- [ ] 不硬编码 SQL 到业务模块
- [ ] 无 codegraph 命令时提示可选增强未启用

---

## Phase 3: 隐私与摘要层

**入口条件**: Phase 2 完成
**任务目标**: 实现脱敏、裁剪、映射存储
**依赖**: Phase 1-2

### 任务清单

| ID | 任务 | 产出物 | 验收 |
|----|------|--------|------|
| 3.1 | 实现 `privacy/sanitize.ts` (路径/符号脱敏) | sanitize.ts | default/strict/off 三模式 |
| 3.2 | 实现 `privacy/token-budget.ts` (上下文裁剪) | token-budget.ts | 超长截断 |
| 3.3 | 实现 `privacy/mapping-store.ts` (本地映射) | mapping-store.ts | 读写缓存 |
| 3.4 | 编写单元测试 `tests/unit/privacy.test.ts` | test | 覆盖4个隐私模式 |
| 3.5 | typecheck + test | - | 通过 |

### 验收清单 (文档第433-438行)

- [ ] default 模式 LLM prompt 不出现绝对路径
- [ ] strict 模式不发送项目结构 JSON
- [ ] off 模式可输出真实相对路径和行号
- [ ] --no-llm 不调用 Anthropic

---

## Phase 4: LLM适配层

**入口条件**: Phase 3 完成
**任务目标**: 统一封装 Anthropic API 调用
**依赖**: Phase 3

### 任务清单

| ID | 任务 | 产出物 | 验收 |
|----|------|--------|------|
| 4.1 | 实现 `adapters/llm-adapter.ts` | llm-adapter.ts | 按文档代码模板 |
| 4.2 | 处理: 无 API key / 空返回 / 网络错误 / 限流 | llm-adapter.ts | 4种错误均有提示 |
| 4.3 | 编写单元测试 `tests/unit/llm-adapter.test.ts` | test | mock 各种错误场景 |
| 4.4 | typecheck + test | - | 通过 |

### 验收清单 (文档第452-457行)

- [ ] 无 API key 时给出明确提示
- [ ] API 空返回时给出明确提示
- [ ] 网络失败时给出明确提示
- [ ] plain-language 模块不直接 new Anthropic

---

## Phase 5: 4个核心模块 (M8/M3/M7/M9)

**入口条件**: Phase 4 完成
**任务目标**: 实现报错翻译、项目扫描、关系图、影响分析
**依赖**: Phase 3-4

### 任务清单

| ID | 任务 | 产出物 | 验收 |
|----|------|--------|------|
| 5.1 | 实现 `plain-language/error-decode.ts` (M8) | error-decode.ts | 四段式输出 |
| 5.2 | 实现 `plain-language/project-scan.ts` (M3) | project-scan.ts | 项目大白话概览 |
| 5.3 | 实现 `plain-language/relation-graph.ts` (M7) | relation-graph.ts | 模块关系说明 |
| 5.4 | 实现 `plain-language/impact-check.ts` (M9) | impact-check.ts | 改动影响分析 |
| 5.5 | 创建 prompt 模板: error.txt, project.txt, relation.txt, impact.txt | prompts/ | 4个模板 |
| 5.6 | 编写模块单元测试 (每模块>=1正常+1异常) | tests/unit/ | 8+ 测试用例 |
| 5.7 | 创建示例输出 `examples/` | examples/ | 4个示例 |
| 5.8 | typecheck + test | - | 全部通过 |

### 验收清单 (文档第476-480行)

- [ ] 4个模块都有单元测试
- [ ] 4个模块都有示例输出
- [ ] 无 LLM 时不崩溃
- [ ] 输出遵循四段式结构

---

## Phase 6: MCP Server

**入口条件**: Phase 5 完成
**任务目标**: 实现 MCP stdio 协议服务端，暴露 6 个工具
**依赖**: Phase 3-5

### 任务清单

| ID | 任务 | 产出物 | 验收 |
|----|------|--------|------|
| 6.1 | 实现 `server/index.ts` (MCP Server 入口) | index.ts | stdio 启动 |
| 6.2 | 实现 `server/tools.ts` (6个工具注册) | tools.ts | 参数校验 |
| 6.3 | 注册工具: explain_error, explain_project, explain_relation, explain_impact, explain_flow, explain_report | tools.ts | 6个工具 |
| 6.4 | 禁止 dbPath 作为用户参数 | tools.ts | 参数白名单 |
| 6.5 | 编写集成测试 `tests/integration/mcp.test.ts` | test | MCP 调用验证 |
| 6.6 | `pnpm run build` + 启动测试 | - | dist/server/index.js 可启动 |

### 验收清单 (文档第519-525行)

- [ ] pnpm run build 成功
- [ ] node dist/server/index.js 能启动
- [ ] MCP 客户端能调用 explain_error
- [ ] MCP 客户端能调用 explain_project
- [ ] projectPath 不存在时返回错误

---

## Phase 7: CLI

**入口条件**: Phase 6 完成
**任务目标**: 实现命令行接口
**依赖**: Phase 3-6

### 任务清单

| ID | 任务 | 产出物 | 验收 |
|----|------|--------|------|
| 7.1 | 实现 `cli/index.ts` | cli/index.ts | commander CLI |
| 7.2 | 支持子命令: error, project, relation, impact | cli/index.ts | 4个子命令 |
| 7.3 | 支持 --privacy strict/default/off 和 --no-llm | cli/index.ts | 参数生效 |
| 7.4 | Shebang行 + 错误帮助信息 | cli/index.ts | #!/usr/bin/env node |
| 7.5 | 编写单元测试 `tests/unit/cli.test.ts` | test | Windows路径/相对路径 |
| 7.6 | pnpm run build + 可执行测试 | - | dist/cli/index.js 可运行 |

### 验收清单 (文档第540-546行)

- [ ] dist/cli/index.js 带 shebang
- [ ] 参数错误时有帮助信息
- [ ] --privacy 三模式生效
- [ ] --no-llm 生效
- [ ] Windows/macOS/Linux 路径处理

---

## Phase 8: 补齐剩余6个模块

**入口条件**: Phase 7 完成
**任务目标**: 实现 M1/M2/M4/M5/M6/M10
**依赖**: Phase 3-5

### 任务清单

| ID | 任务 | 产出物 | 验收 |
|----|------|--------|------|
| 8.1 | 实现 `plain-language/input-detector.ts` (M1) | input-detector.ts | 判断输入类型 |
| 8.2 | 实现 `plain-language/context-detector.ts` (M2) | context-detector.ts | 翻译技术栈 |
| 8.3 | 实现 `plain-language/business-map.ts` (M4) | business-map.ts | 业务逻辑解释 |
| 8.4 | 实现 `plain-language/user-flow.ts` (M5) | user-flow.ts | 用户操作路径 |
| 8.5 | 实现 `plain-language/component-explain.ts` (M6) | component-explain.ts | 单模块解释 |
| 8.6 | 实现 `plain-language/pm-report.ts` (M10) | pm-report.ts | PM视角报告 |
| 8.7 | 创建剩余 prompt 模板: business.txt, flow.txt, component.txt, report.txt | prompts/ | 4个模板 |
| 8.8 | 编写各模块单元测试 (每模块>=1正常+1异常) | tests/unit/ | 12+ 测试 |
| 8.9 | typecheck + test | - | 全部通过 |

### 验收清单 (文档第559-563行)

- [ ] 每个模块至少1个正常测试
- [ ] 每个模块至少1个异常测试
- [ ] 每个模块有示例输出

---

## Phase 9: 文档、许可、发布

**入口条件**: Phase 8 完成
**任务目标**: 完成所有文档、许可声明、示例和发布检查
**依赖**: 全部 Phase 1-8

### 任务清单

| ID | 任务 | 产出物 | 验收 |
|----|------|--------|------|
| 9.1 | 编写 `README.md` | README.md | 含隐私边界+UA模型说明 |
| 9.2 | 编写 `ATTRIBUTION.md` | ATTRIBUTION.md | 按文档模板 |
| 9.3 | 编写 `LICENSE` | LICENSE | MIT |
| 9.4 | 编写 `notices/UA_LICENSE` | UA_LICENSE | MIT 副本 |
| 9.5 | 编写 `notices/CODEGRAPH_LICENSE` | CODEGRAPH_LICENSE | MIT 副本 |
| 9.6 | 编写 `examples/` 4个真实输出 | examples/ | project-overview/error-decode/user-flow/pm-report |
| 9.7 | 全量检查 (pnpm install / typecheck / test / build) | - | 全部通过 |
| 9.8 | 最终验收: 文档第596-612行 发布检查清单 | - | 11项全过 |

### 发布检查清单 (文档第596-612行)

- [ ] pnpm install 成功
- [ ] pnpm run typecheck 成功
- [ ] pnpm test 成功
- [ ] pnpm run build 成功
- [ ] node dist/server/index.js 能启动
- [ ] .env 不在 git 里
- [ ] .ua/ 不在 git 里
- [ ] .codegraph/ 不在 git 里
- [ ] examples 有真实输出
- [ ] README 写清隐私边界
- [ ] README 写清 UA 图谱生成阶段可能调用模型
- [ ] ATTRIBUTION 和 LICENSE 齐全

---

## 异常测试覆盖 (文档第9节)

每个异常场景需在对应 Phase 的测试中覆盖:

| # | 场景 | Phase | 测试断言 |
|---|------|-------|----------|
| 1 | 无 API key | P4 | 提示配置 key，不崩溃 |
| 2 | strict 隐私 | P3 | 不发送项目结构 |
| 3 | --no-llm | P3+P7 | 只输出 JSON，不调 API |
| 4 | UA 图谱不存在 | P1 | 提示先运行 UA |
| 5 | UA 图谱损坏 | P1 | 提示重新生成 |
| 6 | CodeGraph 不存在 | P2 | M7/M9 降级 |
| 7 | CodeGraph 命令不存在 | P2 | 提示可选增强 |
| 8 | projectPath 不存在 | P6 | 提示路径不存在 |
| 9 | 超大项目 | P3 | 自动裁剪 |
| 10 | LLM 空返回 | P4 | 提示重试 |
| 11 | 非报错文本 | P5 | 提示不是报错 |
| 12 | Windows 路径 | P7 | 正确识别 |
| 13 | 相对路径 | P7 | 正确解析 |
