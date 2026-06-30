const filename = Bun.argv[2];

if (!filename) {
  console.log("Error: No filename provided.");
  process.exit(1);
}

const file = Bun.file(filename);
const exists = await file.exists();

if (!exists) {
  console.log("Error: File not found -> " + filename);
  process.exit(1);
}

const content = await file.text();
const lines = content.split(/\r?\n/);

const changedFiles: string[] = [];
for (const line of lines) {
  if (line.startsWith("diff --git")) {
    const parts = line.split(" ");
    if (parts.length >= 4) {
      const filePath = parts[3].replace(/^b\//, "");
      changedFiles.push(filePath);
    }
  }
}

const addedLines = lines.filter(line => line.startsWith("+") && !line.startsWith("+++"));
const removedLines = lines.filter(line => line.startsWith("-") && !line.startsWith("---"));

let riskScore = 0;
const riskReasons: string[] = [];

function addRisk(points: number, reason: string) {
  riskScore += points;
  riskReasons.push("[+" + points + " pts] " + reason);
}

for (const file of changedFiles) {
  if (file.includes("package.json") || file.includes("package-lock.json")) {
    addRisk(20, "Modifying dependencies in " + file);
  }
  if (file.endsWith(".env") || file.includes("config")) {
    addRisk(30, "Changes detected in configuration file: " + file);
  }
  if (file.includes("auth") || file.includes("security")) {
    addRisk(25, "Security or Authentication logic modified in " + file);
  }
}

for (const line of addedLines) {
  if (/secret|password|api_key|token/i.test(line)) {
    addRisk(40, "Potential hardcoded secret added: " + line.trim());
  }
  if (/TODO|FIXME|HACK/i.test(line)) {
    addRisk(5, "Technical debt added: " + line.trim());
  }
  if (line.includes("eval(") || line.includes("dangerouslySetInnerHTML")) {
    addRisk(50, "Critical risk: Use of eval or unsafe HTML rendering.");
  }
}

if (changedFiles.length > 10) {
  addRisk(15, "High blast radius: Over 10 files changed.");
}
if (addedLines.length > 200) {
  addRisk(10, "Large pull request: Over 200 lines added.");
}

console.log("\nSummary Stats:");
console.log("----------------------------------------");
console.log("Files changed:       " + changedFiles.length);
console.log("Lines removed (-):   " + removedLines.length);
console.log("Lines added (+):     " + addedLines.length);

console.log("\nRisk Analysis Assessment:");
console.log("----------------------------------------");
console.log("TOTAL RISK SCORE: " + riskScore);

if (riskScore >= 70) {
  console.log("RISK LEVEL: HIGH");
} else if (riskScore >= 30) {
  console.log("RISK LEVEL: MEDIUM");
} else {
  console.log("RISK LEVEL: LOW");
}

console.log("\nBreakdown of Reasons:");
if (riskReasons.length > 0) {
  for (const reason of riskReasons) {
    console.log("  * " + reason);
  }
} else {
  console.log("  * No high-risk patterns triggered.");
}
console.log("\n");