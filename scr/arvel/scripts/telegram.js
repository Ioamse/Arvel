#!/usr/bin/env node
// Отправка результатов тестов в Telegram-группу через бота.
//
// Настройки — в .telegram.json в корне проекта (файл в .gitignore):
//   { "token": "123456:ABC...", "chatId": "-100123..." }
// или в переменных окружения TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID.
//
//   npm run telegram:chatid   — показать id чатов, куда писали боту
//                               (сначала добавьте бота в группу и напишите там что-нибудь)
//   npm run checklist:tg      — прогнать чек-лист и отправить отчёт в группу
const fs = require('fs');
const path = require('path');

const CONFIG = path.resolve(__dirname, '..', '.telegram.json');

function loadConfig() {
  let file = {};
  if (fs.existsSync(CONFIG)) file = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const token = process.env.TELEGRAM_BOT_TOKEN || file.token;
  const chatId = process.env.TELEGRAM_CHAT_ID || file.chatId;
  if (!token) throw new Error(`Нет токена бота: укажите "token" в ${CONFIG} или TELEGRAM_BOT_TOKEN`);
  return { token, chatId };
}

async function call(token, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', body });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
  return json.result;
}

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Telegram режет сообщения длиннее 4096 символов.
function clip(text, limit = 4000) {
  return text.length <= limit ? text : `${text.slice(0, limit)}\n…`;
}

async function sendMessage(html) {
  const { token, chatId } = loadConfig();
  if (!chatId) throw new Error(`Нет id группы: укажите "chatId" в ${CONFIG} (узнать — npm run telegram:chatid)`);
  const body = new FormData();
  body.append('chat_id', chatId);
  body.append('text', clip(html));
  body.append('parse_mode', 'HTML');
  body.append('disable_web_page_preview', 'true');
  return call(token, 'sendMessage', body);
}

async function sendDocument(filePath, caption = '') {
  const { token, chatId } = loadConfig();
  const body = new FormData();
  body.append('chat_id', chatId);
  body.append('document', new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
  if (caption) body.append('caption', caption);
  return call(token, 'sendDocument', body);
}

async function printChatIds() {
  const { token } = loadConfig();
  const me = await call(token, 'getMe');
  const updates = await call(token, 'getUpdates');
  const chats = new Map();
  for (const u of updates) {
    const chat = (u.message || u.my_chat_member || u.channel_post || {}).chat;
    if (chat) chats.set(chat.id, chat.title || chat.username || chat.first_name);
  }
  console.log(`Бот: @${me.username}`);
  if (!chats.size) {
    console.log('Сообщений боту пока нет. Добавьте его в группу, напишите там что-нибудь и повторите.');
    return;
  }
  for (const [id, title] of chats) console.log(`  ${id}  ${title}`);
  console.log(`Впишите нужный id в "chatId" в ${CONFIG}.`);
}

module.exports = { sendMessage, sendDocument, escapeHtml };

if (require.main === module) {
  printChatIds().catch((e) => { console.error(e.message); process.exit(1); });
}
