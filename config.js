'use strict';

require('dotenv').config();

module.exports = {

  // ─────────────────────────────────────────
  // 👤 OWNER
  // ─────────────────────────────────────────
  owner: [
    '51958959882',
    '51958959882@s.whatsapp.net',
    '42696337031354',
    '+132482980696170',
    '5493884466806@s.whatsapp.net'
  ],

  // ─────────────────────────────────────────
  // 🤖 BOT INFO
  // ─────────────────────────────────────────
  botName    : process.env.BOT_NAME    || '𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕',
  botVersion : process.env.BOT_VERSION || '1.0.0',
  footer     : process.env.BOT_FOOTER  || '𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕',

  // ─────────────────────────────────────────
  // ⚙️ PREFIJO
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
