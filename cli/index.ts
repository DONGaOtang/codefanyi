#!/usr/bin/env node

import { Command } from "commander";
import { explainError } from "../plain-language/error-decode.js";
import { explainProject } from "../plain-language/project-scan.js";
import { explainRelation } from "../plain-language/relation-graph.js";
import { explainImpact } from "../plain-language/impact-check.js";
import { explainFlow } from "../plain-language/user-flow.js";
import { explainReport } from "../plain-language/pm-report.js";
import { PrivacyMode } from "../privacy/sanitize.js";

const program = new Command();

program
  .name("explain-anything")
  .description("把代码项目翻译成大白话")
  .version("0.1.0");

function parsePrivacy(value: string): PrivacyMode {
  if (value !== "strict" && value !== "default" && value !== "off") {
    throw new Error(`无效的隐私模式：${value}。可选值：strict, default, off`);
  }
  return value;
}

// explain-anything error
program
  .command("error")
  .description("把程序报错翻译成大白话")
  .argument("<message>", "报错信息原文")
  .action(async (message: string) => {
    try {
      const result = await explainError(message);
      console.log(result);
    } catch (err) {
      console.error("解释失败：", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// explain-anything project
program
  .command("project")
  .description("用大白话解释项目结构和用途")
  .argument("<path>", "项目根目录路径")
  .option("--privacy <mode>", "隐私模式: strict, default, off", "default")
  .option("--no-llm", "不调用大模型，只输出本地摘要")
  .action(async (path: string, options: { privacy: string; llm: boolean }) => {
    try {
      const result = await explainProject(path, {
        privacyMode: parsePrivacy(options.privacy),
        noLlm: !options.llm,
      });
      console.log(result);
    } catch (err) {
      console.error("分析失败：", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// explain-anything relation
program
  .command("relation")
  .description("用大白话解释模块之间的关系")
  .argument("<path>", "项目根目录路径")
  .option("--privacy <mode>", "隐私模式: strict, default, off", "default")
  .option("--no-llm", "不调用大模型")
  .action(async (path: string, options: { privacy: string; llm: boolean }) => {
    try {
      const result = await explainRelation(path, {
        privacyMode: parsePrivacy(options.privacy),
        noLlm: !options.llm,
      });
      console.log(result);
    } catch (err) {
      console.error("分析失败：", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// explain-anything impact
program
  .command("impact")
  .description("分析文件改动的影响范围")
  .argument("<path>", "项目根目录路径")
  .argument("<file>", "被修改的文件路径")
  .option("--privacy <mode>", "隐私模式: strict, default, off", "default")
  .option("--no-llm", "不调用大模型")
  .action(async (path: string, file: string, options: { privacy: string; llm: boolean }) => {
    try {
      const result = await explainImpact(path, file, {
        privacyMode: parsePrivacy(options.privacy),
        noLlm: !options.llm,
      });
      console.log(result);
    } catch (err) {
      console.error("分析失败：", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// explain-anything flow
program
  .command("flow")
  .description("用大白话解释用户操作流程和页面跳转")
  .argument("<path>", "项目根目录路径")
  .option("--privacy <mode>", "隐私模式: strict, default, off", "default")
  .option("--no-llm", "不调用大模型")
  .action(async (path: string, options: { privacy: string; llm: boolean }) => {
    try {
      const result = await explainFlow(path, {
        privacyMode: parsePrivacy(options.privacy),
        noLlm: !options.llm,
      });
      console.log(result);
    } catch (err) {
      console.error("分析失败：", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// explain-anything report
program
  .command("report")
  .description("生成PM视角的项目报告")
  .argument("<path>", "项目根目录路径")
  .option("--privacy <mode>", "隐私模式: strict, default, off", "default")
  .option("--no-llm", "不调用大模型")
  .action(async (path: string, options: { privacy: string; llm: boolean }) => {
    try {
      const result = await explainReport(path, {
        privacyMode: parsePrivacy(options.privacy),
        noLlm: !options.llm,
      });
      console.log(result);
    } catch (err) {
      console.error("分析失败：", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program.parse();
