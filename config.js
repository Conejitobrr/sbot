'use strict';

require('dotenv').config();

module.exports = {

  // ─────────────────────────────────────────
  // 👤 OWNER
  // ─────────────────────────────────────────
  owner: [
  '51958959882',
  '42696337031354',
  '132482980696170'
],
  // ─────────────────────────────────────────
  // 🤖 BOT INFO
  // ─────────────────────────────────────────
  botName    : process.env.BOT_NAME    || 'SiriusBot',
  botVersion : process.env.BOT_VERSION || '1.0.0',
  footer     : process.env.BOT_FOOTER  || 'SiriusBot',

  // ─────────────────────────────────────────
  // ⚙️ PREFIJO (🔥 AQUÍ CONTROLAS TODO)
  // ─────────────────────────────────────────
  prefix: '.',

  // ─────────────────────────────────────────
  // 💾 BASE DE DATOS
  // ─────────────────────────────────────────
  mongoUri: process.env.MONGO_URI || '',
  dbPath  : './lib/database.json',

  // ─────────────────────────────────────────
  // 🔌 CONEXIÓN
  // ─────────────────────────────────────────
  sessionPath   : './session',
  readMessages  : true,
  autoReconnect : true,
  reconnectDelay: 3000,

  // ─────────────────────────────────────────
  // ⚡ OPCIONES EXTRA
  // ─────────────────────────────────────────
  debug: true,
  antiSpam: true,
  maxMessagesPerMinute: 20
};
