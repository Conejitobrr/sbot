'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');

const DB_PATH = path.resolve(
  process.cwd(),
  config.dbPath || './lib/database.json'
);

const DEFAULT_DB = {
  users: {},
  groups: {}
};

let dbCache = null;
let saveTimer = null;

function cloneDefaultDB() {
  return {
    users: {},
    groups: {}
  };
}

function ensureDir() {
  const dir = path.dirname(DB_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureDB() {
  ensureDir();

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
  }
}

function loadDB() {
  if (dbCache) return dbCache;

  try {
    ensureDB();

    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw || '{}');

    dbCache = {
      users: parsed.users || {},
      groups: parsed.groups || {}
    };

    return dbCache;
  } catch {
    dbCache = cloneDefaultDB();
    saveDBNow();
    return dbCache;
  }
}

function saveDBNow() {
  ensureDir();

  const tmpPath = DB_PATH + '.tmp';

  fs.writeFileSync(
    tmpPath,
    JSON.stringify(dbCache || DEFAULT_DB, null, 2)
  );

  fs.renameSync(tmpPath, DB_PATH);
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    try {
      saveDBNow();
    } catch (e) {
      console.log('❌ Error guardando database:', e?.message || e);
    }
  }, 300);
}

function saveDB() {
  scheduleSave();
}

async function init() {
  ensureDB();
  loadDB();
  console.log('📁 Database JSON cargada');
}

function defaultUser() {
  return {
    banned: false,
    bot: true,
    audios: true,
    premium: false,

    xp: 0,
    level: 1,

    lastDailyXp: 0,
    lastRobXp: 0,

    notifyCount: 0,
    notifyDate: ''
  };
}

function defaultGroup() {
  return {
    welcome: false,
    bot: true,
    audios: true,
    antilink: false,
    antispam: false
  };
}

// ─────────────────────────────────────────
// USERS
// ─────────────────────────────────────────
async function getUser(id) {
  if (!id) return defaultUser();

  const db = loadDB();

  if (!db.users[id]) {
    db.users[id] = defaultUser();
    saveDB();
  } else {
    db.users[id] = {
      ...defaultUser(),
      ...db.users[id]
    };
  }

  return db.users[id];
}

async function setUser(id, data = {}) {
  if (!id) return null;

  const db = loadDB();

  db.users[id] = {
    ...(await getUser(id)),
    ...data
  };

  saveDB();

  return db.users[id];
}

async function getUserSetting(userId, key) {
  const user = await getUser(userId);
  return user[key];
}

async function setUserSetting(userId, key, value) {
  const user = await getUser(userId);
  user[key] = value;

  return await setUser(userId, user);
}

// ─────────────────────────────────────────
// GROUPS
// ─────────────────────────────────────────
async function getGroup(id) {
  if (!id) return defaultGroup();

  const db = loadDB();

  if (!db.groups[id]) {
    db.groups[id] = defaultGroup();
    saveDB();
  } else {
    db.groups[id] = {
      ...defaultGroup(),
      ...db.groups[id]
    };
  }

  return db.groups[id];
}

async function setGroup(id, data = {}) {
  if (!id) return null;

  const db = loadDB();

  db.groups[id] = {
    ...(await getGroup(id)),
    ...data
  };

  saveDB();

  return db.groups[id];
}

async function getGroupSetting(groupId, key) {
  const group = await getGroup(groupId);
  return group[key];
}

async function setGroupSetting(groupId, key, value) {
  const group = await getGroup(groupId);
  group[key] = value;

  return await setGroup(groupId, group);
}

// ─────────────────────────────────────────
// BAN
// ─────────────────────────────────────────
async function isBanned(id) {
  const user = await getUser(id);
  return user.banned === true;
}

async function banUser(id) {
  return await setUser(id, { banned: true });
}

async function unbanUser(id) {
  return await setUser(id, { banned: false });
}

// ─────────────────────────────────────────
// XP
// ─────────────────────────────────────────
function calculateLevel(xp = 0) {
  return Math.floor(Number(xp || 0) / 1000) + 1;
}

async function addXP(id, amount = 0) {
  const user = await getUser(id);

  const value = Math.max(0, Number(amount) || 0);

  user.xp = Math.max(0, Number(user.xp || 0) + value);
  user.level = calculateLevel(user.xp);

  return await setUser(id, user);
}

async function removeXP(id, amount = 0) {
  const user = await getUser(id);

  const value = Math.max(0, Number(amount) || 0);

  user.xp = Math.max(0, Number(user.xp || 0) - value);
  user.level = calculateLevel(user.xp);

  return await setUser(id, user);
}

async function transferXP(from, to, amount = 0) {
  const value = Math.max(0, Number(amount) || 0);

  if (!from || !to || value <= 0) return false;

  const sender = await getUser(from);

  if ((sender.xp || 0) < value) {
    return false;
  }

  await removeXP(from, value);
  await addXP(to, value);

  return true;
}

// ─────────────────────────────────────────
// NOTIFY LIMIT
// ─────────────────────────────────────────
function getToday() {
  return new Date().toISOString().slice(0, 10);
}

async function canUseNotify(userId, isAdmin = false, isOwner = false, isPremium = false) {
  if (isAdmin || isOwner || isPremium) return true;

  const user = await getUser(userId);
  const today = getToday();

  if (user.notifyDate !== today) {
    user.notifyDate = today;
    user.notifyCount = 0;
  }

  if ((user.notifyCount || 0) >= 5) return false;

  user.notifyCount = (user.notifyCount || 0) + 1;

  await setUser(userId, user);
  return true;
}

async function getRemainingUses(userId) {
  const user = await getUser(userId);
  const today = getToday();

  if (user.notifyDate !== today) return 5;

  return Math.max(0, 5 - (user.notifyCount || 0));
}

// ─────────────────────────────────────────
// BACKUP / DEBUG
// ─────────────────────────────────────────
async function getAll() {
  return loadDB();
}

async function saveAll(data = DEFAULT_DB) {
  dbCache = {
    users: data.users || {},
    groups: data.groups || {}
  };

  saveDBNow();

  return dbCache;
}

process.on('exit', () => {
  try {
    if (dbCache) saveDBNow();
  } catch {}
});

module.exports = {
  init,

  getUser,
  setUser,
  getUserSetting,
