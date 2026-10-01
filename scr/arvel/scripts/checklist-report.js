#!/usr/bin/env node
// Отчёт «чек-лист ↔ автотесты».
//
// 1. Берёт QA-чек-лист из Google Sheets (свежую версию; без сети — копию
//    scripts/checklist.csv, которая обновляется при каждом удачном скачивании).
// 2. Запускает Jest и собирает результаты тестов.
// 3. Для каждого пункта чек-листа ищет тест: describe-группа (РЕГИСТРАЦИЯ И
//    ВХОД / ПОКУПАТЕЛЬ / ПРОДАВЕЦ / АДМИН) → describe-раздел (заголовок столбца)
//    → it с тем же текстом, что и пункт.
// 4. Печатает статус каждого пункта и пишет checklist-report.csv. Код выхода
//    ненулевой, если какой-то пункт упал или остался без теста.
//
//   npm run checklist            — скачать чек-лист, прогнать тесты, отчёт
//   npm run checklist -- --offline  — не ходить в сеть, взять scripts/checklist.csv
//   npm run checklist:tg         — то же + сводка и отчёт в Telegram (см. scripts/telegram.js)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SHEET_ID = '15F_yiEpWzs76yPPz1awGo3OUmagQX9zAaCdLC0wp_xg';
const SHEET_GID = '404673571';
const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(__dirname, 'checklist.csv');
const REPORT = path.join(ROOT, 'checklist-report.csv');
const offline = process.argv.includes('--offline');
const telegram = process.argv.includes('--telegram');

// --- CSV ---

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; } else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; } else field += c;
  }
  row.push(field.replace(/\r$/, ''));
  rows.push(row);
  return rows;
}

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// Строка 1 — роли (объединённые ячейки: значение только в первом столбце),
// строка 2 — разделы. Пункты — только в столбцах с заголовком раздела;
// соседние столбцы без заголовка — заметки тестировщика, их пропускаем.
function extractItems(rows) {
  const [groupRow, sectionRow, ...body] = rows;
  const items = [];
  let group = '';
  for (let col = 0; col < sectionRow.length; col += 1) {
    if (norm(groupRow[col])) group = norm(groupRow[col]);
    const section = norm(sectionRow[col]);
    if (!section) continue;
    for (const r of body) {
      const text = norm(r[col]);
      if (text) items.push({ group, section, text });
    }
  }
  return items;
}

async function loadChecklist() {
  if (!offline) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      fs.writeFileSync(CACHE, text);
      return { text, source: 'Google Sheets' };
    } catch (e) {
      console.warn(`Не удалось скачать чек-лист (${e.message}) — беру сохранённую копию.`);
    }
  }
  if (!fs.existsSync(CACHE)) throw new Error(`Нет сохранённой копии ${CACHE}`);
  return { text: fs.readFileSync(CACHE, 'utf8'), source: 'scripts/checklist.csv' };
}

// --- Jest ---

function runJest() {
  const out = path.join(ROOT, 'coverage', 'jest-results.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const jestBin = require.resolve('jest/bin/jest');
  spawnSync(process.execPath, [jestBin, '--json', '--testLocationInResults', `--outputFile=${out}`, '--silent'], {
    cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'],
  });
  const json = JSON.parse(fs.readFileSync(out, 'utf8'));
  return json.testResults.flatMap((file) => file.assertionResults.map((a) => ({
    ancestors: a.ancestorTitles.map(norm),
    title: norm(a.title),
    status: a.status,
    file: path.relative(ROOT, file.name).split(path.sep).join('/') + (a.location ? `:${a.location.line}` : ''),
    message: (a.failureMessages || []).join('\n').split('\n')[0],
  })));
}

// --- Отчёт ---

(async () => {
  const { text, source } = await loadChecklist();
  const items = extractItems(parseCsv(text));
  const tests = runJest();

  const results = items.map((item) => {
    const matched = tests.filter((t) => t.title === item.text
      && t.ancestors[0] === item.group
      && t.ancestors.includes(item.section));
    let status = 'НЕТ ТЕСТА';
    if (matched.length) {
      status = matched.some((t) => t.status === 'failed') ? 'ПАДАЕТ'
        : matched.every((t) => t.status === 'passed') ? 'OK' : 'ПРОПУЩЕН';
    }
    return { ...item, status, tests: matched };
  });

  const icon = { OK: '✅', 'ПАДАЕТ': '❌', 'НЕТ ТЕСТА': '⚠️ ', 'ПРОПУЩЕН': '⏭️ ' };
  let lastKey = '';
  for (const r of results) {
    const key = `${r.group} › ${r.section}`;
    if (key !== lastKey) { console.log(`\n${key}`); lastKey = key; }
    console.log(`  ${icon[r.status]} ${r.text}${r.status === 'OK' ? '' : `  — ${r.status}`}`);
    for (const t of r.tests.filter((x) => x.status === 'failed')) console.log(`      ${t.file}: ${t.message}`);
  }

  const count = (s) => results.filter((r) => r.status === s).length;
  console.log(`\nЧек-лист: ${source}. Пунктов: ${results.length}. `
    + `OK: ${count('OK')}, падает: ${count('ПАДАЕТ')}, без теста: ${count('НЕТ ТЕСТА')}, пропущено: ${count('ПРОПУЩЕН')}.`);

  const csv = [['Раздел', 'Подраздел', 'Пункт', 'Статус', 'Тест'].join(',')]
    .concat(results.map((r) => [r.group, r.section, r.text, r.status, r.tests.map((t) => t.file).join(' ')]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')))
    .join('\n');
  fs.writeFileSync(REPORT, `﻿${csv}\n`);
  console.log(`Отчёт для таблицы: ${path.relative(process.cwd(), REPORT)}`);

  if (count('ПРОПУЩЕН')) {
    console.log('Пропущенные пункты помечены в тестах как устаревшие — поправьте их в таблице.');
  }

  // Тесты сверх чек-листа (API-клиент, контексты, найденные баги) тоже должны
  // быть зелёными — иначе отчёт «всё OK» обманывал бы.
  const matchedSet = new Set(results.flatMap((r) => r.tests));
  const extraFailed = tests.filter((t) => t.status === 'failed' && !matchedSet.has(t));
  const extraPassed = tests.filter((t) => t.status === 'passed' && !matchedSet.has(t)).length;
  console.log(`\nТесты вне чек-листа: пройдено ${extraPassed}, упало ${extraFailed.length}.`);
  for (const t of extraFailed) {
    console.log(`  ❌ ${[...t.ancestors, t.title].join(' › ')}\n      ${t.file}: ${t.message}`);
  }
  fs.writeFileSync(path.join(ROOT, 'coverage', 'extra-failed.json'), JSON.stringify(extraFailed, null, 2));

  if (telegram) {
    const { sendMessage, sendDocument, escapeHtml: h } = require('./telegram');
    const ok = !count('ПАДАЕТ') && !count('НЕТ ТЕСТА') && !extraFailed.length;
    const lines = [
      `${ok ? '✅' : '❌'} <b>ARVELL — автотесты</b> ${new Date().toLocaleString('ru-RU')}`,
      `Пунктов чек-листа: ${results.length}`,
      `OK: ${count('OK')} · падает: ${count('ПАДАЕТ')} · без теста: ${count('НЕТ ТЕСТА')} · пропущено: ${count('ПРОПУЩЕН')}`,
      `Вне чек-листа: пройдено ${extraPassed}, упало ${extraFailed.length}`,
    ];
    const failed = results.filter((r) => r.status === 'ПАДАЕТ');
    if (failed.length) {
      lines.push('', '<b>Падают:</b>');
      for (const r of failed) lines.push(`❌ ${h(r.section)} › ${h(r.text)}`);
    }
    if (extraFailed.length) {
      lines.push('', '<b>Упали вне чек-листа:</b>');
      for (const t of extraFailed) lines.push(`❌ ${h([...t.ancestors, t.title].join(' › '))}`);
    }
    const missing = results.filter((r) => r.status === 'НЕТ ТЕСТА');
    if (missing.length) {
      lines.push('', '<b>Без теста:</b>');
      for (const r of missing) lines.push(`⚠️ ${h(r.section)} › ${h(r.text)}`);
    }
    try {
      await sendMessage(lines.join('\n'));
      await sendDocument(REPORT, 'Полный отчёт по чек-листу');
      console.log('Отчёт отправлен в Telegram.');
    } catch (e) {
      console.error(`Не удалось отправить в Telegram: ${e.message}`);
    }
  }

  process.exit(count('ПАДАЕТ') || count('НЕТ ТЕСТА') || extraFailed.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
