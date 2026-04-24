'use strict';

const chalk    = require('chalk');
const figlet   = require('figlet');
const readline = require('readline');
const path     = require('path');
const fs       = require('fs');

// ═══════════════════════════════════════
// CONFIG SIMPLE
// ═══════════════════════════════════════

const config = {
  botName     : 'SiriusBot',
  botVersion  : '1.0.0',
  sessionPath : './session',
  defaultPhone: '51958959882'
};

// ═══════════════════════════════════════
// BANNER
// ═══════════════════════════════════════

function showBanner() {
  console.clear();
  const lines = figlet.textSync('SiriusBot', { font: 'Big' }).split('\n');
  lines.forEach(l => console.log(chalk.cyan.bold(l)));

  console.log('');
  console.log(chalk.gray('  ─────────────────────────────────────────'));
  console.log(chalk.white('  🤖 Bot     : ') + chalk.green(config.botName));
  console.log(chalk.white('  📦 Versión : ') + chalk.yellow(config.botVersion));
  console.log(chalk.gray('  ─────────────────────────────────────────\n'));
}

// ═══════════════════════════════════════
// READLINE
// ═══════════════════════════════════════

function createRL() {
  return readline.createInterface({
    input : process.stdin,
    output: process.stdout,
  });
}

function ask(rl, q) {
  return new Promise(r => rl.question(q, ans => r(ans.trim())));
}

// ═══════════════════════════════════════
// MÉTODO DE CONEXIÓN
// ═══════════════════════════════════════

async function askConnectionMethod() {
  const sessionDir = path.resolve(process.cwd(), config.sessionPath);
  const credsFile  = path.join(sessionDir, 'creds.json');

  // Si ya existe sesión → conectar directo
  if (fs.existsSync(credsFile)) {
    return { method: 'saved', phone: null };
  }

  const rl = createRL();

  console.log(chalk.cyan('  ¿Cómo deseas conectar WhatsApp?\n'));
  console.log(chalk.white('  [1] QR'));
  console.log(chalk.white('  [2] Código con número\n'));

  let choice = '';
  while (!['1','2'].includes(choice)) {
    choice = await ask(rl, chalk.yellow('  → Opción: '));
  }

  if (choice === '1') {
    rl.close();
    return { method: 'qr', phone: null };
  }

  // Código con número
  console.log(chalk.gray('\n  Número por defecto: ' + config.defaultPhone));
  let phone = await ask(rl, chalk.yellow('  → Presiona ENTER o escribe otro: '));

  if (!phone) phone = config.defaultPhone;

  // limpiar
  phone = phone.replace(/\D/g, '');

  rl.close();
  return { method: 'code', phone };
}

// ═══════════════════════════════════════
// MAIN
// ═══════════════════════════════════════

async function main() {
  showBanner();

  const { method, phone } = await askConnectionMethod();

  console.log(chalk.cyan('\n  Conectando...\n'));

  try {
    const { startBot } = require('./main');
    await startBot({ method, phone });
  } catch (e) {
    console.error(chalk.red('Error:'), e.message);
  }
}

main();
