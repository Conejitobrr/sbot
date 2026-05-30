'use strict';

const fs = require('fs');
const path = require('path');
const { once } = require('events');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const execFileAsync = promisify(execFile);

const deletedCache = new Map();

const MAX_CACHE = 1200;
const CACHE_TIME = 2 * 60 * 60 * 1000; // 2 horas
const MAX_MEDIA_SIZE = 100 * 1024 * 1024; // 100 MB

const MEDIA_DIR = path.join(process.cwd(), 'temp', 'antidelete');
const TEMP_DIR = path.join(process.cwd(), 'temp');

function ensureDir(dir) {
if (!fs.existsSync(dir)) {
fs.mkdirSync(dir, { recursive: true });
}
}

function cleanJid(jid = '') {
return String(jid).split(':')[0];
}

function number(jid = '') {
return cleanJid(jid)
.split('@')[0]
.replace(/\D/g, '');
}

function getMsgKey(remoteJid, id) {
return ${cleanJid(remoteJid)}:${id};
}

function uniqueList(list = []) {
return [...new Set(
list
.filter(Boolean)
.map(String)
)];
}

function getSaveKeys(remoteJid, id, sender = '') {
return uniqueList([
getMsgKey(remoteJid, id),
getMsgKey(sender, id),
String(id)
]);
}

function getPossibleDeletedKeys(remoteJid, deletedKey = {}) {
const id = deletedKey?.id;
if (!id) return [];

return uniqueList([
getMsgKey(remoteJid, id),
getMsgKey(deletedKey.remoteJid, id),
getMsgKey(deletedKey.participant, id),
String(id)
]);
}

function getProtocolMessage(msg) {
const m = msg.message || {};

return (
m.protocolMessage ||
m.ephemeralMessage?.message?.protocolMessage ||
null
);
}

function isDeleteMessage(msg) {
const protocol = getProtocolMessage(msg);

if (!protocol) return false;

return (
protocol.type === 0 ||
protocol.type === 'REVOKE' ||
!!protocol.key?.id
);
}

function getDeletedKey(msg) {
return getProtocolMessage(msg)?.key || null;
}

function findSavedMessage(remoteJid, deletedKey) {
const keys = getPossibleDeletedKeys(remoteJid, deletedKey);

for (const key of keys) {
const saved = deletedCache.get(key);
if (saved) return { key, saved };
}

return null;
}

function unwrapMessage(message = {}) {
if (message.ephemeralMessage?.message) {
return unwrapMessage(message.ephemeralMessage.message);
}

if (message.documentWithCaptionMessage?.message) {
return unwrapMessage(message.documentWithCaptionMessage.message);
}

return message;
}

function isViewOnce(message = {}) {
return (
message.viewOnceMessage ||
message.viewOnceMessageV2 ||
message.viewOnceMessageV2Extension ||
message.imageMessage?.viewOnce === true ||
message.videoMessage?.viewOnce === true
);
}

function getContextInfo(message = {}) {
return (
message.extendedTextMessage?.contextInfo ||
message.imageMessage?.contextInfo ||
message.videoMessage?.contextInfo ||
message.audioMessage?.contextInfo ||
message.ptvMessage?.contextInfo ||
message.stickerMessage?.contextInfo ||
message.documentMessage?.contextInfo ||
null
);
}

function getMessageMentions(message = {}) {
const ctx = getContextInfo(message);

return Array.isArray(ctx?.mentionedJid)
? ctx.mentionedJid.map(cleanJid).filter(Boolean)
: [];
}

function uniqueMentions(list = []) {
return [...new Set(
list
.map(cleanJid)
.filter(Boolean)
)];
}

function getText(message = {}) {
return (
message.conversation ||
message.extendedTextMessage?.text ||
message.imageMessage?.caption ||
message.videoMessage?.caption ||
message.documentMessage?.caption ||
''
);
}

// ✅ DETECCIÓN TIPO .VER
function getMediaInfo(message = {}) {
if (message.imageMessage) {
return {
type: 'image',
mediaType: 'image',
media: message.imageMessage,
mimetype: message.imageMessage.mimetype || 'image/jpeg',
caption: message.imageMessage.caption || '',
fileName: 'imagen.jpg'
};
}

if (message.videoMessage) {
if (message.videoMessage.gifPlayback) {
return {
type: 'gif',
mediaType: 'video',
media: message.videoMessage,
mimetype: message.videoMessage.mimetype || 'video/mp4',
caption: message.videoMessage.caption || '',
gifPlayback: true,
fileName: 'gif.mp4'
};
}

return {  
  type: 'video',  
  mediaType: 'video',  
  media: message.videoMessage,  
  mimetype: message.videoMessage.mimetype || 'video/mp4',  
  caption: message.videoMessage.caption || '',  
  gifPlayback: false,  
  fileName: 'video.mp4'  
};

}

if (message.ptvMessage) {
return {
type: 'video',
mediaType: 'video',
media: message.ptvMessage,
mimetype: message.ptvMessage.mimetype || 'video/mp4',
caption: '',
gifPlayback: false,
fileName: 'video_circular.mp4'
};
}

if (message.audioMessage) {
return {
type: 'audio',
mediaType: 'audio',
media: message.audioMessage,
mimetype: message.audioMessage.mimetype || 'audio/mpeg',
ptt: message.audioMessage.ptt || false,
caption: '',
fileName: message.audioMessage.ptt ? 'nota_voz.ogg' : 'audio.mp3'
};
}

if (message.stickerMessage) {
return {
type: 'sticker',
mediaType: 'sticker',
media: message.stickerMessage,
mimetype: message.stickerMessage.mimetype || 'image/webp',
caption: '',
fileName: 'sticker.webp'
};
}

if (message.documentMessage) {
const mimetype = message.documentMessage.mimetype || 'application/octet-stream';
const fileName = message.documentMessage.fileName || 'archivo';
const caption = message.documentMessage.caption || '';
const lowerName = String(fileName).toLowerCase();

if (mimetype === 'image/gif' || lowerName.endsWith('.gif')) {  
  return {  
    type: 'gif_file',  
    mediaType: 'document',  
    media: message.documentMessage,  
    mimetype,  
    fileName,  
    caption  
  };  
}  

if (mimetype.startsWith('image/')) {  
  return {  
    type: 'image',  
    mediaType: 'document',  
    media: message.documentMessage,  
    mimetype,  
    fileName,  
    caption  
  };  
}  

if (mimetype.startsWith('video/')) {  
  return {  
    type: 'video',  
    mediaType: 'document',  
    media: message.documentMessage,  
    mimetype,  
    fileName,  
    caption,  
    gifPlayback: false  
  };  
}  

if (mimetype.startsWith('audio/')) {  
  return {  
    type: 'audio',  
    mediaType: 'document',  
    media: message.documentMessage,  
    mimetype,  
    fileName,  
    ptt: false,  
    caption  
  };  
}  

return {  
  type: 'document',  
  mediaType: 'document',  
  media: message.documentMessage,  
  mimetype,  
  fileName,  
  caption  
};

}

return null;
}

function safeFileName(name = 'archivo') {
return String(name || 'archivo')
.replace(/[<>:"/\|?*\x00-\x1F]/g, '')
.replace(/\s+/g, '')
.slice(0, 80);
}

function getExtension(mediaInfo = {}) {
const fileName = String(mediaInfo.fileName || '').toLowerCase();
const mimetype = String(mediaInfo.mimetype || '').toLowerCase();

if (fileName.includes('.') && !fileName.endsWith('.')) {
const ext = fileName.split('.').pop().replace(/[^a-z0-9]/g, '');
if (ext) return ext;
}

if (mimetype.includes('jpeg')) return 'jpg';
if (mimetype.includes('jpg')) return 'jpg';
if (mimetype.includes('png')) return 'png';
if (mimetype.includes('webp')) return 'webp';
if (mimetype.includes('gif')) return 'gif';
if (mimetype.includes('mp4')) return 'mp4';
if (mimetype.includes('webm')) return 'webm';
if (mimetype.includes('mpeg')) return 'mp3';
if (mimetype.includes('mp3')) return 'mp3';
if (mimetype.includes('ogg')) return 'ogg';
if (mimetype.includes('opus')) return 'ogg';
if (mimetype.includes('pdf')) return 'pdf';
if (mimetype.includes('zip')) return 'zip';

return 'bin';
}

async function downloadMediaToFile(mediaInfo, msgId) {
ensureDir(MEDIA_DIR);

const ext = getExtension(mediaInfo);
const safeId = String(msgId || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '');
const baseName = safeFileName(mediaInfo.fileName || media.${ext});

let finalName = anti_${Date.now()}_${safeId}_${baseName};

if (!finalName.toLowerCase().endsWith(.${ext})) {
finalName += .${ext};
}

const filePath = path.join(MEDIA_DIR, finalName);

const stream = await downloadContentFromMessage(
mediaInfo.media,
mediaInfo.mediaType
);

const write = fs.createWriteStream(filePath);
let size = 0;

try {
for await (const chunk of stream) {
size += chunk.length;

if (size > MAX_MEDIA_SIZE) {  
    write.destroy();  

    try {  
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);  
    } catch {}  

    return {  
      filePath: null,  
      size,  
      tooLarge: true  
    };  
  }  

  if (!write.write(chunk)) {  
    await once(write, 'drain');  
  }  
}  

write.end();  
await once(write, 'finish');  

if (!fs.existsSync(filePath) || fs.statSync(filePath).size <= 0) {  
  return {  
    filePath: null,  
    size: 0,  
    tooLarge: false  
  };  
}  

return {  
  filePath,  
  size,  
  tooLarge: false  
};

} catch (err) {
try {
write.destroy();
} catch {}

try {  
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);  
} catch {}  

throw err;

}
}

async function convertGifToMp4(inputPath, outputPath) {
await execFileAsync('ffmpeg', [
'-y',
'-i', inputPath,
'-movflags', '+faststart',
'-pix_fmt', 'yuv420p',
'-vf', 'fps=15,scale=trunc(iw/2)*2:trunc(ih/2)*2',
outputPath
]);
}

function deleteSaved(cacheKey, saved) {
try {
const keys = saved?.cacheKeys?.length ? saved.cacheKeys : [cacheKey];

for (const key of keys) {  
  deletedCache.delete(key);  
}  

if (saved?.filePath && fs.existsSync(saved.filePath)) {  
  fs.unlinkSync(saved.filePath);  
}

} catch {}
}

function cleanOldCache() {
const now = Date.now();
const seen = new Set();

for (const [key, value] of deletedCache.entries()) {
if (!value || seen.has(value)) continue;

seen.add(value);  

if (now - Number(value.time || 0) > CACHE_TIME) {  
  deleteSaved(key, value);  
}

}
}

async function isEnabled(db, remoteJid, fromGroup) {
try {
if (!fromGroup) return true;

const value = await db.getGroupSetting(remoteJid, 'antidelete');  
return value === true;

} catch {
return !fromGroup;
}
}

async function saveMessage(ctx) {
const {
msg,
remoteJid,
sender,
pushName
} = ctx;

const id = msg.key?.id;

if (!id || !msg.message) return;
if (isDeleteMessage(msg)) return;

const message = unwrapMessage(originalMessage);
const media = getMediaInfo(message);
const text = getText(message);
const mentions = getMessageMentions(message);

let filePath = null;
let savedSize = 0;
let tooLarge = false;

if (media) {
try {
const saved = await downloadMediaToFile(media, id);

filePath = saved.filePath;  
  savedSize = saved.size;  
  tooLarge = saved.tooLarge;  

  if (filePath) {  
    console.log(`🕵️ Antidelete guardó: ${media.type} | ${savedSize} bytes | ${path.basename(filePath)}`);  
  } else if (tooLarge) {  
    console.log(`⚠️ Antidelete ignoró archivo pesado: ${savedSize} bytes`);  
  } else {  
    console.log(`⚠️ Antidelete detectó ${media.type}, pero no pudo guardarlo.`);  
  }  

} catch (err) {  
  console.log('⚠️ Antidelete no pudo descargar media:', err?.message || err);  
}

}

const cacheKeys = getSaveKeys(remoteJid, id, sender);

const savedData = {
remoteJid,
sender: cleanJid(sender),
pushName: pushName || 'Usuario',
message,
text,
mentions,
media,
filePath,
savedSize,
tooLarge,
cacheKeys,
time: Date.now()
};

for (const key of cacheKeys) {
deletedCache.set(key, savedData);
}

if (deletedCache.size > MAX_CACHE) {
const firstKey = deletedCache.keys().next().value;
const firstSaved = deletedCache.get(firstKey);
deleteSaved(firstKey, firstSaved);
}
}

function buildCaption(user, mediaCaption = '') {
return `🕵️ MENSAJE ELIMINADO

👤 Usuario: @${number(user)}${mediaCaption ? \n\n💬 Descripción:\n${mediaCaption} : ''}`;
}

async function sendSavedMedia(sock, remoteJid, saved, mentions) {
const media = saved.media;

if (!media || !saved.filePath || !fs.existsSync(saved.filePath)) {
return false;
}

let tempOutput = null;

try {
const caption = buildCaption(
saved.sender,
media.caption || saved.text || ''
);

if (media.type === 'gif_file') {  
  ensureDir(TEMP_DIR);  

  const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;  
  tempOutput = path.join(TEMP_DIR, `antidelete_gif_${id}.mp4`);  

  await convertGifToMp4(saved.filePath, tempOutput);  

  const mp4Buffer = fs.readFileSync(tempOutput);  

  await sock.sendMessage(remoteJid, {  
    video: mp4Buffer,  
    mimetype: 'video/mp4',  
    gifPlayback: true,  
    caption,  
    mentions  
  });  

  return true;  
}  

const buffer = fs.readFileSync(saved.filePath);  

if (!buffer || !buffer.length) return false;  

if (media.type === 'image') {  
  await sock.sendMessage(remoteJid, {  
    image: buffer,  
    mimetype: media.mimetype,  
    caption,  
    mentions  
  });  

  return true;  
}  

if (media.type === 'video' || media.type === 'gif') {  
  await sock.sendMessage(remoteJid, {  
    video: buffer,  
    mimetype: media.mimetype || 'video/mp4',  
    gifPlayback: media.gifPlayback || false,  
    caption,  
    mentions  
  });  

  return true;  
}  

if (media.type === 'audio') {  
  await sock.sendMessage(remoteJid, {  
    audio: buffer,  
    mimetype: media.mimetype,  
    ptt: media.ptt || false  
  });  

  await sock.sendMessage(remoteJid, {  
    text: caption,  
    mentions  
  });  

  return true;  
}  

if (media.type === 'sticker') {  
  await sock.sendMessage(remoteJid, {  
    sticker: buffer  
  });  

  await sock.sendMessage(remoteJid, {  
    text: caption,  
    mentions  
  });  

  return true;  
}  

if (media.type === 'document') {  
  await sock.sendMessage(remoteJid, {  
    document: buffer,  
    mimetype: media.mimetype,  
    fileName: media.fileName || 'archivo',  
    caption,  
    mentions  
  });  

  return true;  
}  

return false;

} finally {
try {
if (tempOutput && fs.existsSync(tempOutput)) {
fs.unlinkSync(tempOutput);
}
} catch {}
}
}

module.exports = {
commands: ['antidelete', 'antiborrar'],

async onMessage(ctx) {
const {
sock,
msg,
remoteJid,
sender,
pushName,
fromGroup,
db
} = ctx;

try {  
  cleanOldCache();  

  const enabled = await isEnabled(db, remoteJid, fromGroup);  

  // Guarda mensajes y multimedia normales apenas llegan  
  if (!isDeleteMessage(msg)) {  
    if (enabled) {  
      await saveMessage({  
        msg,  
        remoteJid,  
        sender,  
        pushName  
      });  
    }  

    return;  
  }  

  if (!enabled) return;  

  const deletedKey = getDeletedKey(msg);  
  const found = findSavedMessage(remoteJid, deletedKey);  

  if (!found) return;  

  const { key: cacheKey, saved } = found;  

  const user = saved.sender;  
  const text = saved.text || getText(saved.message);  

  const mentions = uniqueMentions([  
    user,  
    ...(saved.mentions || [])  
  ]);  

  if (saved.media) {  
    const sent = await sendSavedMedia(sock, remoteJid, saved, mentions);  

    if (sent) {  
      deleteSaved(cacheKey, saved);  
      return;  
    }  

    await sock.sendMessage(remoteJid, {  
      text:

`🕵️ MENSAJE ELIMINADO

👤 Usuario: @${number(user)}

⚠️ El mensaje tenía un archivo, pero no se pudo reenviar desde la carpeta temporal.${text ? \n\n💬 Texto:\n${text} : ''}`,
mentions
});

deleteSaved(cacheKey, saved);  
    return;  
  }  

  if (!text) {  
    deleteSaved(cacheKey, saved);  
    return;  
  }  

  await sock.sendMessage(remoteJid, {  
    text:

`🕵️ MENSAJE ELIMINADO

👤 Usuario: @${number(user)}

💬 Mensaje:
${text}`,
mentions
});

deleteSaved(cacheKey, saved);  

} catch (err) {  
  console.log('❌ Error en antidelete:', err?.message || err);  
}

},

async execute(ctx) {
const {
sock,
msg,
remoteJid,
args,
fromGroup,
isAdmin,
isOwner,
db
} = ctx;

try {  
  if (!fromGroup) {  
    return sock.sendMessage(remoteJid, {  
      text: '✅ En chats privados, *antidelete* siempre está activo.'  
    }, { quoted: msg });  
  }  

  if (!isOwner && !isAdmin) {  
    return sock.sendMessage(remoteJid, {  
      text: '❌ Solo admins o owner pueden usar este comando.'  
    }, { quoted: msg });  
  }  

  const option = (args[0] || '').toLowerCase();  

  if (!option) {  
    const enabled = await isEnabled(db, remoteJid, fromGroup);  

    return sock.sendMessage(remoteJid, {  
      text:

`🕵️ ANTIDELETE

Estado: ${enabled ? 'Activado ✅' : 'Desactivado ❌'}

Uso:
.antidelete on
.antidelete off`
}, { quoted: msg });
}

if (!['on', 'off'].includes(option)) {  
    return sock.sendMessage(remoteJid, {  
      text: '❌ Usa:\n.antidelete on\n.antidelete off'  
    }, { quoted: msg });  
  }  

  await db.setGroupSetting(  
    remoteJid,  
    'antidelete',  
    option === 'on'  
  );  

  return sock.sendMessage(remoteJid, {  
    text: option === 'on'  
      ? '✅ Antidelete activado en este grupo.'  
      : '✅ Antidelete desactivado en este grupo.'  
  }, { quoted: msg });  

} catch (err) {  
  console.log('❌ Error comando antidelete:', err?.message || err);  

  return sock.sendMessage(remoteJid, {  
    text: '❌ Error configurando antidelete.'  
  }, { quoted: msg });  
}

}
};
