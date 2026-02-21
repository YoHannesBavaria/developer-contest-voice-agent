import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const idx = trimmed.indexOf("=");
    if (idx < 1) {
      continue;
    }
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function setStatus(value) {
  if (value === undefined) {
    return "missing";
  }
  if (value === "") {
    return "empty";
  }
  return "set";
}

const env = { ...readEnv(path.join(root, ".env")), ...process.env };

const checks = [
  ["README", exists("README.md")],
  ["Prompt/Flow config", exists("config/conversation-flow.yaml")],
  ["Demo call script", exists("artifacts/demo-call-script.md")],
  ["Demo call output artifact", exists("artifacts/demo-call-output.json")],
  ["Loom placeholder (manual)", false],
  ["Submission done (manual)", false]
];

const keyChecks = [
  ["CALENDAR_PROVIDER", setStatus(env.CALENDAR_PROVIDER)],
  ["CALCOM_API_KEY", setStatus(env.CALCOM_API_KEY)],
  ["CALCOM_EVENT_TYPE_ID", setStatus(env.CALCOM_EVENT_TYPE_ID)],
  ["OPENAI_API_KEY", setStatus(env.OPENAI_API_KEY)],
  ["TWILIO_ACCOUNT_SID", setStatus(env.TWILIO_ACCOUNT_SID)],
  ["TWILIO_AUTH_TOKEN", setStatus(env.TWILIO_AUTH_TOKEN)],
  ["TWILIO_PHONE_NUMBER", setStatus(env.TWILIO_PHONE_NUMBER)]
];

const report = [];
report.push("# Contest Readiness Report");
report.push(`Generated: ${new Date().toISOString()}`);
report.push("");
report.push("## Deliverables");
for (const [label, ok] of checks) {
  report.push(`- [${ok ? "x" : " "}] ${label}`);
}
report.push("");
report.push("## Key Status");
for (const [key, status] of keyChecks) {
  report.push(`- ${key}: ${status}`);
}

const missing = checks.filter(([, ok]) => !ok).map(([label]) => label);
if (env.CALENDAR_PROVIDER === "calcom") {
  if (setStatus(env.CALCOM_API_KEY) !== "set") {
    missing.push("CALCOM_API_KEY");
  }
  if (setStatus(env.CALCOM_EVENT_TYPE_ID) !== "set") {
    missing.push("CALCOM_EVENT_TYPE_ID");
  }
}

if (missing.length === 0) {
  report.push("");
  report.push("Result: READY (technical checks)");
} else {
  report.push("");
  report.push("Result: NOT READY");
  report.push("Missing:");
  for (const item of missing) {
    report.push(`- ${item}`);
  }
}

fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
const outPath = path.join(root, "artifacts", "contest-readiness.md");
fs.writeFileSync(outPath, `${report.join("\n")}\n`, "utf8");

console.log(report.join("\n"));
console.log(`\nSaved report: ${outPath}`);

