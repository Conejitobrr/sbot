'use strict';

const fs = require('fs');
const path = require('path');

const MUTED_FILE = path.join(process.cwd(), 'lib', 'muted.json');

function loadMuted() {
  try {
    if (!fs.existsSync(MUTED_FILE)) fs.writeFileSync(MUTED_FILE, JSON.stringify({}), 'utf8');
    return JSON.parse(fs.readFileSync(MUTED_FILE, 'utf8'));
  } catch { return {}; }
}

function saveMuted(data) {
  try {
    const dir = path.dirname(MUTED_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MUTED_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

function cleanNumber(jid = '') {
  return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

module.exports = {
  commands: ['mutear', 'desmutear', 'mute', 'unmute'],

  // 🔥 Fuerza Bruta: Intenta borrar el mensaje sin preguntar
  async onMessage(ctx) {
    const { sock, msg, remoteJid, sender, fromGroup } = ctx;
    
    if (!fromGroup) return;

    const data = loadMuted();
    const groupMutes = data[remoteJid] || [];
    const senderClean = cleanNumber(sender);

    if (groupMutes.includes(senderClean)) {
      try {
        await sock.sendMessage(remoteJid, { delete: msg.key });
      } catch (e) {
        // WhatsApp no dejó borrarlo (ej: no es admin en realidad), lo ignoramos en silencio.
      }
    }
  },

  async execute(ctx) {
    const { sock, remoteJid, msg, command, fromGroup, isAdmin, isOwner } = ctx;

    if (!fromGroup) {
      return sock.sendMessage(remoteJid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg });
    }

    if (!isAdmin && !isOwner) {
      return sock.sendMessage(remoteJid, { text: '❌ Solo los administradores pueden usar este comando.' }, { quoted: msg });
    }

    const contextInfo = msg.message?.extendedTextMessage?.contextInfo || {};
    const mentionedJid = contextInfo.mentionedJid || [];
    const quotedJid = contextInfo.participant ? [contextInfo.participant] : [];
    
    const targets = [...mentionedJid, ...quotedJid].map(cleanNumber).filter(Boolean);

    if (targets.length === 0) {
      return sock.sendMessage(remoteJid, { 
        text: `❌ Debes mencionar o responder al mensaje del usuario.\nEjemplo: .${command} @usuario` 
      }, { quoted: msg });
    }

    const data = loadMuted();
    if (!data[remoteJid]) data[remoteJid] = [];

    const isMuting = command === 'mutear' || command === 'mute';
    let processed = 0;

    for (const target of targets) {
      const index = data[remoteJid].indexOf(target);

      if (isMuting) {
        if (index === -1) {
          data[remoteJid].push(target);
          processed++;
        }
      } else {
        if (index !== -1) {
          data[remoteJid].splice(index, 1);
          processed++;
        }
      }
    }

    saveMuted(data);

    if (processed === 0) {
      return sock.sendMessage(remoteJid, { text: isMuting ? '⚠️ Ese usuario ya estaba muteado.' : '⚠️ Ese usuario no estaba muteado.' }, { quoted: msg });
    }

    return sock.sendMessage(remoteJid, { 
      text: isMuting 
        ? '🤫 *Usuario Muteado.*\nSi soy Administrador en este grupo, borraré sus mensajes automáticamente.' 
        : '🔊 *Usuario Desmuteado.*\nYa puede volver a hablar libremente.'
    }, { quoted: msg });
  }
};
