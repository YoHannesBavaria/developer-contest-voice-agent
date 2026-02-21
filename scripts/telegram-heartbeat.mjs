import process from "node:process";

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!token || !chatId) {
  console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
  process.exit(1);
}

const everySeconds = Number.parseInt(process.env.HEARTBEAT_EVERY_SECONDS ?? "90", 10);
const iterations = Number.parseInt(process.env.HEARTBEAT_ITERATIONS ?? "5", 10);
const prefix = process.env.HEARTBEAT_PREFIX ?? "Codex Status";

async function send(text) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });

  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(`Telegram send failed: ${JSON.stringify(payload)}`);
  }
}

for (let index = 1; index <= iterations; index += 1) {
  await send(`${prefix}: heartbeat ${index}/${iterations} (${new Date().toISOString()})`);
  if (index < iterations) {
    await new Promise((resolve) => setTimeout(resolve, everySeconds * 1000));
  }
}

console.log("heartbeat completed");

