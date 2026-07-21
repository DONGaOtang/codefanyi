---
name: colt
description: Analyzes full-stack code projects and generates plain-language Markdown analysis reports by orchestrating the codefanyi MCP tools (explain_project, explain_relation, explain_flow, explain_error, explain_impact, explain_report). Use when the user invokes /colt or asks to analyze, explain, summarize, or translate a code project's structure, module relations, user flows, errors, or change impacts into plain language, or requests a full-stack analysis report.
---

# Colt — 全栈代码白话分析

通过 `/colt` 指令族调用 codefanyi MCP Server 的分析工具，把全栈代码翻译成非技术人员看得懂的大白话，并生成结构化 Markdown 报告。

## 前置条件

- codefanyi MCP Server 已在客户端连接，提供 6 个 `explain_*` 工具
- 若工具不可用，先提示用户构建并配置 codefanyi MCP Server，再继续

## 子命令路由

根据 `/colt` 后的参数选择对应工具。**参数为空时执行「全栈大总结」**。

| 指令 | 参数 | 调用工具 | 产出 |
|------|------|----------|------|
| `/colt` | 无 | explain_project + explain_relation + explain_flow + explain_report | 完整「全栈分析报告.md」 |
| `/colt project` | 项目路径 | explain_project | 项目整体概览 |
| `/colt relation` | 项目路径 | explain_relation | 模块接洽关系 |
| `/colt flow` | 项目路径 | explain_flow | 用户操作 / 业务逻辑流 |
| `/colt error` | 报错信息 | explain_error | 报错大白话解码 |
| `/colt impact` | 项目路径 + 文件 | explain_impact | 改动影响范围 |
| `/colt report` | 项目路径 | explain_report | PM 视角项目报告 |

> 项目路径默认取当前工作区根目录；用户未提供时主动询问或从上下文推断。

## 全栈大总结工作流（/colt 默认）

复制此清单并逐步推进：

```
- [ ] 1. 确认项目路径（当前工作区或用户指定）
- [ ] 2. 调用 explain_project 获取项目概览
- [ ] 3. 调用 explain_relation 获取模块关系
- [ ] 4. 调用 explain_flow 获取业务 / 用户流程
- [ ] 5. 调用 explain_report 获取 PM 视角总结
- [ ] 6. 按四段式模板组装内容
- [ ] 7. 写入「全栈分析报告.md」到项目根目录
- [ ] 8. 向用户报告文件绝对路径与摘要
```

调用工具时传入 `projectPath`（绝对路径）。除非用户另有要求，隐私模式用默认 `default`。

## 报告模板（四段式）

生成的「全栈分析报告.md」必须按以下结构组织，语言面向非技术人员：

```markdown
# 全栈分析报告

> 生成时间：YYYY-MM-DD ｜ 项目：<项目名> ｜ 隐私模式：default

## 一、项目大总结
【它在说什么】整个项目是干什么的、解决什么问题
【为什么】为什么这样设计、核心价值
【现在该做什么】当前状态与下一步建议
【风险】需要注意的隐患

## 二、逐文件 / 模块说明
针对每个核心文件 / 模块：
- **<模块名>**：它在讲什么 / 承担什么职责 / 关键逻辑

## 三、逻辑梳理
【它在说什么】核心业务逻辑、数据如何流动
【为什么】流程为什么这样设计
【现在该做什么】理解后该如何使用 / 验证
【风险】逻辑上的薄弱点

## 四、接洽关系
【它在说什么】模块之间如何连接、下一步流向哪个模块
【为什么】依赖关系的设计意图
【现在该做什么】改动某模块时该联动检查什么
【风险】耦合过紧或单点依赖的风险
```

## 单项子命令输出

- `/colt project | relation | flow | report`：直接在对话中返回对应工具的大白话结果，不强制写文件；用户要求保存时再写入 Markdown
- `/colt error <报错>` 与 `/colt impact <文件>`：同理，直接返回结果

## 输出位置

- 报告默认写入**当前正在分析的项目根目录**下的 `全栈分析报告.md`
- 路径必须是用户工作区的动态路径，**禁止写死到 codefanyi 工具自身目录**
- 写入后明确告知用户文件的绝对路径

## 隐私与离线

- 默认 `default` 脱敏模式；用户可指定 `strict` / `off`
- 用户要求纯本地时，调用工具传 `noLlm: true`（不调用外部大模型）
