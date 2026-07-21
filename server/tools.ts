import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { explainError } from "../plain-language/error-decode.js";
import { explainProject } from "../plain-language/project-scan.js";
import { explainRelation } from "../plain-language/relation-graph.js";
import { explainImpact } from "../plain-language/impact-check.js";
import { explainFlow } from "../plain-language/user-flow.js";
import { explainReport } from "../plain-language/pm-report.js";
import { existsSync } from "node:fs";

function validateProjectPath(projectPath: string): void {
  if (!existsSync(projectPath)) {
    throw new Error(`项目路径不存在：${projectPath}`);
  }
}

export function registerTools(server: McpServer): void {
  // M8: explain_error
  server.tool(
    "explain_error",
    "把程序报错翻译成大白话",
    { message: z.string().describe("报错信息原文") },
    async ({ message }) => {
      try {
        const result = await explainError(message);
        return { content: [{ type: "text", text: result }] };
      } catch (err) {
        return { content: [{ type: "text", text: `解释失败：${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  // M3: explain_project
  server.tool(
    "explain_project",
    "用大白话解释项目结构和用途",
    {
      projectPath: z.string().describe("项目根目录的绝对路径"),
      privacyMode: z.enum(["strict", "default", "off"]).optional().default("default"),
      noLlm: z.boolean().optional().default(false),
    },
    async ({ projectPath, privacyMode, noLlm }) => {
      try {
        validateProjectPath(projectPath);
        const result = await explainProject(projectPath, { privacyMode, noLlm });
        return { content: [{ type: "text", text: result }] };
      } catch (err) {
        return { content: [{ type: "text", text: `分析失败：${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  // M7: explain_relation
  server.tool(
    "explain_relation",
    "用大白话解释模块之间的关系",
    {
      projectPath: z.string().describe("项目根目录的绝对路径"),
      privacyMode: z.enum(["strict", "default", "off"]).optional().default("default"),
      noLlm: z.boolean().optional().default(false),
    },
    async ({ projectPath, privacyMode, noLlm }) => {
      try {
        validateProjectPath(projectPath);
        const result = await explainRelation(projectPath, { privacyMode, noLlm });
        return { content: [{ type: "text", text: result }] };
      } catch (err) {
        return { content: [{ type: "text", text: `分析失败：${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  // M9: explain_impact
  server.tool(
    "explain_impact",
    "分析文件改动的影响范围",
    {
      projectPath: z.string().describe("项目根目录的绝对路径"),
      filePath: z.string().describe("被修改的文件路径"),
      privacyMode: z.enum(["strict", "default", "off"]).optional().default("default"),
      noLlm: z.boolean().optional().default(false),
    },
    async ({ projectPath, filePath, privacyMode, noLlm }) => {
      try {
        validateProjectPath(projectPath);
        const result = await explainImpact(projectPath, filePath, { privacyMode, noLlm });
        return { content: [{ type: "text", text: result }] };
      } catch (err) {
        return { content: [{ type: "text", text: `分析失败：${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  // M5: explain_flow
  server.tool(
    "explain_flow",
    "用大白话解释用户操作流程，描述页面跳转和核心操作路径",
    {
      projectPath: z.string().describe("项目根目录的绝对路径"),
      privacyMode: z.enum(["strict", "default", "off"]).optional().default("default"),
      noLlm: z.boolean().optional().default(false),
    },
    async ({ projectPath, privacyMode, noLlm }) => {
      try {
        validateProjectPath(projectPath);
        const result = await explainFlow(projectPath, { privacyMode, noLlm });
        return { content: [{ type: "text", text: result }] };
      } catch (err) {
        return { content: [{ type: "text", text: `分析失败：${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  // M10: explain_report
  server.tool(
    "explain_report",
    "生成PM视角的项目报告，包括概览、技术健康度、进度评估和风险提示",
    {
      projectPath: z.string().describe("项目根目录的绝对路径"),
      privacyMode: z.enum(["strict", "default", "off"]).optional().default("default"),
      noLlm: z.boolean().optional().default(false),
    },
    async ({ projectPath, privacyMode, noLlm }) => {
      try {
        validateProjectPath(projectPath);
        const result = await explainReport(projectPath, { privacyMode, noLlm });
        return { content: [{ type: "text", text: result }] };
      } catch (err) {
        return { content: [{ type: "text", text: `分析失败：${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );
}
