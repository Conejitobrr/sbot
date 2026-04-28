
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
const DB_PATH = path.resolve(
  process.cwd(),
  config.dbPath || './lib/database.json'
);

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

      // XP SYSTEM
      xp: 0,
      level: 1,

      // COOLDOWNS
      lastDailyXp: 0,
      lastRobXp: 0
    };

    saveDB(db);
  }

  return db.users[id];
}

async function setUser(id, data) {
  const db = loadDB();

  db.users[id] = {
    ...(db.users[id] || {}),
    ...data
  };

  saveDB(db);
}

// ─────────────────────────────────────────────
// 👥 GROUPS
// ─────────────────────────────────────────────
async function getGroup(id) {
  const db = loadDB();

  if (!db.groups[id]) {
    db.groups[id] = {
      welcome: false
    };

    saveDB(db);
  }

  return db.groups[id];
}

async function setGroup(id, data) {
  const db = loadDB();

  db.groups[id] = {
    ...(db.groups[id] || {}),
    ...data
  };

  saveDB(db);
}

// NUEVO: obtener setting específico del grupo
async function getGroupSetting(groupId, key) {
  const group = await getGroup(groupId);
  return group[key];
}

// NUEVO: cambiar setting específico del grupo
async function setGroupSetting(groupId, key, value) {
  const group = await getGroup(groupId);

  group[key] = value;

  await setGroup(groupId, group);

  return group;
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
// ⭐ XP SYSTEM
// ─────────────────────────────────────────────
function calculateLevel(xp) {
  return Math.floor((xp || 0) / 1000) + 1;
}

async function addXP(id, amount) {
  const user = await getUser(id);

  user.xp = (user.xp || 0) + amount;
  user.level = calculateLevel(user.xp);

  const db = loadDB();
  db.users[id] = user;
  saveDB(db);

  return user;
}

async function removeXP(id, amount) {
  const user = await getUser(id);

  user.xp = Math.max(0, (user.xp || 0) - amount);
  user.level = calculateLevel(user.xp);

  const db = loadDB();
  db.users[id] = user;
  saveDB(db);

  return user;
}

async function transferXP(from, to, amount) {
  const sender = await getUser(from);

  if ((sender.xp || 0) < amount) {
    return false;
  }

  await removeXP(from, amount);
  await addXP(to, amount);

  return true;
}

// ─────────────────────────────────────────────
// 📤 EXPORT
// ─────────────────────────────────────────────
module.exports = {
  init,

  // USERS
  getUser,
  setUser,

  // GROUPS
  getGroup,
  setGroup,
  getGroupSetting,
  setGroupSetting,

  // BAN
  isBanned,
  banUser,
  unbanUser,

  // XP
  addXP,
  removeXP,
  transferXP,
  calculateLevel
};
