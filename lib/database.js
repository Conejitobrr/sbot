'use strict';

// ╔════════════════════════════════════════════╗
// ║        🌌 SIRIUSBOT — DATABASE           ║
// ╚════════════════════════════════════════════╝

const fs     = require('fs');
const path   = require('path');
const config = require('../config');

let USE_MONGO = false;
let mongoose;

// ─────────────────────────────────────────────
// 📁 JSON PATH
// ─────────────────────────────────────────────
const DB_PATH = path.resolve(process.cwd(), config.dbPath || './lib/database.json');

const DEFAULT_DB = {
  users  : {},
  groups : {}
};

// ─────────────────────────────────────────────
// 📁 JSON FUNCTIONS
// ─────────────────────────────────────────────
function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
  }
}

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH));
  } catch {
    return { ...DEFAULT_DB };
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ─────────────────────────────────────────────
// 🚀 INIT
// ─────────────────────────────────────────────
async function init() {
  if (config.mongoUri) {
    try {
      mongoose = require('mongoose');
      await mongoose.connect(config.mongoUri);
      USE_MONGO = true;
      console.log('✅ MongoDB conectado');
    } catch (e) {
      console.log('⚠️ Mongo falló → usando JSON');
      ensureDB();
    }
  } else {
    ensureDB();
    console.log('📁 Usando JSON local');
  }
}

// ─────────────────────────────────────────────
// 👤 USERS
// ─────────────────────────────────────────────
async function getUser(id) {
  const db = loadDB();

  if (!db.users[id]) {
    db.users[id] = {
      banned: false,
      premiumUntil: 0,
      dailyUses: 0,
      lastDay: ''
    };
    saveDB(db);
  }

  return db.users[id];
}

async function setUser(id, data) {
  const db = loadDB();
  db.users[id] = { ...(db.users[id] || {}), ...data };
  saveDB(db);
}

// ─────────────────────────────────────────────
// 🚫 BAN
// ─────────────────────────────────────────────
async function isBanned(id) {
  const user = await getUser(id);
  return user.banned === true;
}

async function banUser(id) {
  await setUser(id, { banned: true });
}

async function unbanUser(id) {
  await setUser(id, { banned: false });
}

// ─────────────────────────────────────────────
// ⭐ PREMIUM
// ─────────────────────────────────────────────
async function addPremium(id, days) {
  const user = await getUser(id);
  const now = Date.now();

  const extra = days * 24 * 60 * 60 * 1000;

  user.premiumUntil = (user.premiumUntil > now ? user.premiumUntil : now) + extra;

  const db = loadDB();
  db.users[id] = user;
  saveDB(db);
}

async function removePremium(id) {
  const user = await getUser(id);
  user.premiumUntil = 0;

  const db = loadDB();
  db.users[id] = user;
  saveDB(db);
}

async function isPremium(id) {
  const user = await getUser(id);
  return user.premiumUntil > Date.now();
}

async function getPremiumTime(id) {
  const user = await getUser(id);
  return Math.max(0, user.premiumUntil - Date.now());
}

// ─────────────────────────────────────────────
// 🔥 USO DIARIO (NOTIFY)
// ─────────────────────────────────────────────
function checkDaily(user) {
  const today = new Date().toDateString();

  if (user.lastDay !== today) {
    user.lastDay = today;
    user.dailyUses = 0;
  }
}

async function canUseNotify(id) {
  const db = loadDB();
  const user = db.users[id] || {};

  checkDaily(user);

  if ((user.dailyUses || 0) >= 5) return false;

  user.dailyUses = (user.dailyUses || 0) + 1;

  db.users[id] = user;
  saveDB(db);

  return true;
}

async function getRemainingUses(id) {
  const user = await getUser(id);
  checkDaily(user);
  return 5 - (user.dailyUses || 0);
}

// ─────────────────────────────────────────────
// 📤 EXPORT
// ─────────────────────────────────────────────
module.exports = {
  init,
  getUser,
  setUser,
  isBanned,
  banUser,
  unbanUser,

  // ⭐ premium
  addPremium,
  removePremium,
  isPremium,
  getPremiumTime,

  // 🔥 notify limit
  canUseNotify,
  getRemainingUses
};
