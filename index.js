'use strict';

require('dotenv').config();

const chalk = require('chalk');
const figlet = require('figlet');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const config = require('./config');

function showBanner() {
  console.clear();

  const botName = config.botName || 'SiriusBot';
  const lines = figlet.textSync(botName, { font: 'Big' }).split('\n');

  lines.forEach(line => console.log(chalk.cyan.bold(line)));

  console.log('');
  console.log(chalk.gray('  ─────────────────────────────────────────'));
  console.log(chalk.white('  🤖 Bot     : ') + chalk.green(botName));
  console.log(chalk.white('  📦 Versión : ') + chalk.yellow(config.botVersion || '1.0.0'));
  console.log(chalk.white('  ⚙️ Prefijo : ') + chalk.yellow(config.prefix || '.'));
  console.log(chalk.gray('  ─────────────────────────────────────────\n'));
}

function createRL() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function ask(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

function hasSavedSession() {
  const sessionDir = path.resolve(process.cwd(), config.sessionPath || './session');
  const credsFile = path.join(sessionDir, 'creds.json');

  return fs.existsSync(credsFile);
}

async function askConnectionMethod() {
  if (hasSavedSession()) {
    console.log(chalk.green('  ✅ Sesión encontrada. Conectando automáticamente...\n'));
    return { method: 'saved', phone: null };
  }

  const rl = createRL();

  console.log(chalk.cyan('  ¿Cómo deseas conectar WhatsApp?\n'));
  console.log(chalk.white('  [1] QR'));
  console.log(chalk.white('  [2] Código con número\n'));

  let choice = '';

  while (!['1', '2'].includes(choice)) {
    choice = await ask(rl, chalk.yellow('  → Opción: '));
  }

  if (choice === '1') {
    rl.close();
    return { method: 'qr', phone: null };
  }

  const defaultPhone = process.env.DEFAULT_PHONE || config.owner?.[0] || '';

  if (defaultPhone) {
    console.log(chalk.gray('\n  Número por defecto: ' + defaultPhone));
  }

  let phone = await ask(
    rl,
    chalk.yellow('  → Presiona ENTER o escribe el número con código de país: ')
  );

  if (!phone) phone = defaultPhone;

  phone = String(phone).replace(/\D/g, '');

  rl.close();

  if (!phone) {
    console.log(chalk.red('\n  ❌ No ingresaste ningún número.\n'));
    process.exit(1);
  }

  return { method: 'code', phone };
}

async function main() {
  showBanner();

  const { method, phone } = await askConnectionMethod();

  console.log(chalk.cyan('  🚀 Iniciando conexión...\n'));

  try {
    const { startBot } = require('./main');
    await startBot({ method, phone });
  } catch (e) {
    console.error(chalk.red('❌ Error al iniciar el bot:'), e?.message || e);
    process.exit(1);
  }
}

process.on('uncaughtException', err => {
  console.log(chalk.red('❌ Error no controlado:'), err?.message || err);
});

process.on('unhandledRejection', err => {
  console.log(chalk.red('❌ Promesa rechazada:'), err?.message || err);
});

main();
