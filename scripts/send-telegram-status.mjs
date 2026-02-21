import process from "node:process";

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const message = process.argv.slice(2).join(" ");

if (!token || !chatId) {
  console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
  process.exit(1);
}

if (!message) {
  console.error("Usage: node scripts/send-telegram-status.mjs \"your message\"");
  process.exit(1);
}

const url = `https://api.telegram.org/bot${token}/sendMessage`;
const response = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chat_id: chatId,
    text: message
  })
});

const payload = await response.json();
if (!payload.ok) {
  console.error("Telegram send failed", payload);
  process.exit(1);
}

console.log("sent");

