import { isCodeGraphInstalled, hasCodeGraphIndex } from "../adapters/codegraph-adapter.js";

async function main() {
  console.log("Explain Anything · 环境检测\n");

  // Node.js
  const nodeVersion = process.version;
  console.log(`Node.js: ${nodeVersion}`);

  // CodeGraph
  const cgInstalled = isCodeGraphInstalled();
  if (cgInstalled) {
    console.log("CodeGraph: 已安装 ✅");
    const hasIndex = await hasCodeGraphIndex(process.cwd());
    if (hasIndex) {
      console.log("CodeGraph 索引: 已存在 ✅");
    } else {
      console.log("CodeGraph 索引: 未找到，运行 codegraph init 建立索引");
    }
  } else {
    console.log("CodeGraph: 未安装 ⚠️");
    console.log("  可选增强：安装 CodeGraph 后关系分析会更准确");
    console.log("  安装方式: 参考 https://github.com/colbymchenry/codegraph");
  }

  console.log("\n环境检测完成。");
}

main().catch(console.error);
