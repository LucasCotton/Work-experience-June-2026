import { existsSync } from "fs";
import { extname } from "path";

const diffFilename = Bun.argv[2];
if (!diffFilename) {
  console.error("Error: Please provide a path to a local .diff or .patch file.");
  process.exit(1);
}

if (!existsSync(diffFilename)) {
  console.error(`Error: File not found -> ${diffFilename}`);
  process.exit(1);
}

const configPath = "./rules.json";
if (!existsSync(configPath)) {
  console.error("Error: rules.json file not found. Please create it first.");
  process.exit(1);
}
const config = JSON.parse(await Bun.file(configPath).text());

const diffContent = await Bun.file(diffFilename).text();
const lines = diffContent.split(/\r?\n/);

let currentFile = "";
const changedFiles: string[] = [];
const addedLinesByFile: { [filename: string]: string[] } = {};
let totalAddedLinesCount = 0;
let totalRemovedLinesCount = 0;

for (const line of lines) {
  if (line.startsWith("diff --git")) {
    const parts = line.split(" ");
    if (parts.length >= 4) {
      currentFile = parts[3].replace(/^b\//, "");
      changedFiles.push(currentFile);
      addedLinesByFile[currentFile] = [];
    }
    continue;
  }

  if (line.startsWith("+") && !line.startsWith("+++")) {
    totalAddedLinesCount++;
    if (currentFile) {
      addedLinesByFile[currentFile].push(line);
    }
  } else if (line.startsWith("-") && !line.startsWith("---")) {
    totalRemovedLinesCount++;
  }
}

let riskScore = 0;
const riskReasons: string[] = [];

function addRisk(points: number, reason: string) {
  riskScore += points;
  riskReasons.push(`[+${points} pts] ${reason}`);
}

function getPackForFile(filename: string) {
  const ext = extname(filename).toLowerCase();
  for (const packName in config.packs) {
    const pack = config.packs[packName];
    if (pack.extensions && pack.extensions.includes(ext)) {
      return pack;
    }
  }
  return null;
}

for (const file of changedFiles) {
  const filePack = getPackForFile(file);
  const globalPack = config.packs.global;

  if (globalPack?.fileRules) {
    for (const rule of globalPack.fileRules) {
      if (new RegExp(rule.pattern, "i").test(file)) {
        addRisk(rule.points, `${rule.reason}: ${file}`);
      }
    }
  }

  if (filePack?.fileRules) {
    for (const rule of filePack.fileRules) {
      if (new RegExp(rule.pattern, "i").test(file)) {
        addRisk(rule.points, `${rule.reason}: ${file}`);
      }
    }
  }

  const linesInFile = addedLinesByFile[file] || [];
  for (const line of linesInFile) {
    if (globalPack?.lineRules) {
      for (const rule of globalPack.lineRules) {
        if (new RegExp(rule.pattern, "i").test(line)) {
          addRisk(rule.points, `${rule.reason} in ${file}: ${line.trim().substring(0, 60)}...`);
        }
      }
    }

    if (filePack?.lineRules) {
      for (const rule of filePack.lineRules) {
        if (new RegExp(rule.pattern, "i").test(line)) {
          addRisk(rule.points, `${rule.reason} in ${file}: ${line.trim().substring(0, 60)}...`);
        }
      }
    }
  }
}

if (changedFiles.length > config.thresholds.maxFiles.limit) {
  addRisk(config.thresholds.maxFiles.points, config.thresholds.maxFiles.reason);
}
if (totalAddedLinesCount > config.thresholds.maxLinesAdded.limit) {
  addRisk(config.thresholds.maxLinesAdded.points, config.thresholds.maxLinesAdded.reason);
}

let riskLevel = "LOW";
let colorClass = "low";
if (riskScore >= 70) {
  riskLevel = "HIGH";
  colorClass = "high";
} else if (riskScore >= 30) {
  riskLevel = "MEDIUM";
  colorClass = "medium";
}

const gaugeDeg = Math.min(180, (riskScore / 120) * 180);

const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Diff Risk Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f6f8fa; color: #24292f; margin: 40px; }
    .card { background: white; border: 1px solid #d0d7de; border-radius: 6px; padding: 24px; max-width: 700px; margin: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    h1 { margin-top: 0; font-size: 20px; border-bottom: 1px solid #d0d7de; padding-bottom: 10px; }
    .stats-container { display: flex; gap: 20px; margin-bottom: 24px; }
    .stat-box { flex: 1; padding: 12px; background: #f6f8fa; border-radius: 6px; text-align: center; border: 1px solid #d0d7de;}
    .stat-box data { display: block; font-size: 24px; font-weight: bold; }
    .add { color: #1a7f37; }
    .remove { color: #cf222e; }
    .risk-overview { display: flex; align-items: center; justify-content: space-around; background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 5px solid #ccc; }
    .risk-overview.low { border-left-color: #2da44e; }
    .risk-overview.medium { border-left-color: #bf8700; }
    .risk-overview.high { border-left-color: #cf222e; }
    .gauge-wrapper { width: 160px; height: 80px; position: relative; overflow: hidden; }
    .gauge { width: 160px; height: 160px; border-radius: 50%; background: #e1e4e8; position: absolute; box-sizing: border-box; border: 20px solid #e1e4e8; }
    .gauge-fill { width: 160px; height: 160px; border-radius: 50%; position: absolute; box-sizing: border-box; border: 20px solid transparent; border-bottom-color: transparent !important; border-left-color: transparent !important; transform: rotate(0deg); transform-origin: center; transition: transform 0.5s ease; }
    .low .gauge-fill { border-color: #2da44e; }
    .medium .gauge-fill { border-color: #bf8700; }
    .high .gauge-fill { border-color: #cf222e; }
    .gauge-text { position: absolute; bottom: 0; width: 100%; text-align: center; font-weight: bold; font-size: 14px; }
    ul { padding-left: 0; }
    li { margin-bottom: 8px; font-family: monospace; font-size: 13px; background: #f6f8fa; padding: 8px; border-radius: 4px; list-style-type: none; border-left: 3px solid #6e7781;}
  </style>
</head>
<body>
<div class="card">
  <h1>Risk Assessment for <code>${diffFilename}</code></h1>
  <div class="stats-container">
    <div class="stat-box"><data>${changedFiles.length}</data>Files Changed</div>
    <div class="stat-box"><data class="add">+${totalAddedLinesCount}</data>Lines Added</div>
    <div class="stat-box"><data class="remove">-${totalRemovedLinesCount}</data>Lines Removed</div>
  </div>
  <div class="risk-overview ${colorClass}">
    <div class="gauge-wrapper">
      <div class="gauge"></div>
      <div class="gauge-fill" style="transform: rotate(${gaugeDeg}deg);"></div>
      <div class="gauge-text">Score: ${riskScore}</div>
    </div>
    <div>
      <h2 style="margin:0 0 5px 0;">Risk Level: ${riskLevel}</h2>
      <p style="margin:0; color:#57606a;">Automated assessment based on multi-language packs.</p>
    </div>
  </div>
  <h3>Breakdown of Triggered Rules:</h3>
  <ul>
    ${riskReasons.length > 0 
      ? riskReasons.map(r => `<li>${r}</li>`).join('') 
      : `<li style="border-left-color: #2da44e;">No high-risk patterns triggered.</li>`
    }
  </ul>
</div>
</body>
</html>
`;

const outputFilename = "diff-risk-report.html";
await Bun.write(outputFilename, htmlReport);
console.log(`\n🎉 Success! Report generated: ${outputFilename}`);