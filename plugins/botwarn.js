'use strict';

const db = require('../lib/database');

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function cleanNumber(jid = '') {
  return String(jid)
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '');
}

function getTarget(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);

  return null;
}

module.exports = {
  commands: ['botwarn', 'delbotwarn'],
  description: 'Sistema de advertencias globales para banear del bot',

  async execute(ctx) {
    const {
      sock,
      remoteJid,
      msg,
      command,
      isOwner
    } = ctx;

    try {
      // 🛑 Solo el Owner puede dar advertencias de baneo
      if (!isOwner) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Solo el Owner puede usar el sistema de advertencias globales.'
        }, { quoted: msg });
      }

      const target = getTarget(msg);

      if (!target) {
        return sock.sendMessage(remoteJid, {
          text: `❌ Debes mencionar o responder a un usuario.\n\nEjemplos:\n.${command} @usuario`
        }, { quoted: msg });
      }

      const targetNumber = cleanNumber(target);
      
      // No puedes advertirte a ti mismo ni a otros Owners (opcional, pero buena práctica)
      if (targetNumber === cleanNumber(ctx.sender)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No puedes darte advertencias a ti mismo.'
        }, { quoted: msg });
      }

      // Obtenemos los datos del usuario de la base de datos
      const userData = await db.getUser(targetNumber);

      // ==========================================
      // 1. DAR ADVERTENCIA GLOBAL (.botwarn)
      // ==========================================
      if (command === 'botwarn') {
        userData.botWarns = (userData.botWarns || 0) + 1;

        // Si llega a 3 advertencias
        if (userData.botWarns >= 3) {
          // Usamos la misma función de tu banuser.js para banearlo de verdad
          await db.banUser(targetNumber);
          
          // Reiniciamos las advertencias por si alguna vez lo desbaneas con .unbanuser
          userData.botWarns = 0; 
          await db.setUser(targetNumber, userData);

          return sock.sendMessage(remoteJid, {
            text: 
`🚫 *BANEADO DEL BOT* 🚫

👤 @${targetNumber}

Has alcanzado el límite de *3/3 advertencias globales*.
Acabas de ser baneado y ya no podrás usar ningún comando del bot.`,
            mentions: [`${targetNumber}@s.whatsapp.net`]
          }, { quoted: msg });
        } 
        
        // Si tiene menos de 3 advertencias
        else {
          await db.setUser(targetNumber, userData);

          return sock.sendMessage(remoteJid, {
            text: 
`⚠️ *ADVERTENCIA GLOBAL* ⚠️

👤 @${targetNumber}

Has recibido una advertencia oficial por mal comportamiento.

🚨 *Advertencias: ${userData.botWarns}/3*

Si llegas a 3 advertencias, serás baneado completamente del bot.`,
            mentions: [`${targetNumber}@s.whatsapp.net`]
          }, { quoted: msg });
        }
      }

      // ==========================================
      // 2. QUITAR ADVERTENCIA GLOBAL (.delbotwarn)
      // ==========================================
      if (command === 'delbotwarn') {
        userData.botWarns = (userData.botWarns || 0) - 1;
        
        // Asegurarse de que no baje de 0
        if (userData.botWarns < 0) userData.botWarns = 0;

        await db.setUser(targetNumber, userData);

        return sock.sendMessage(remoteJid, {
          text: 
`✅ *ADVERTENCIA REMOVIDA*

👤 @${targetNumber}

Se te ha perdonado y quitado una advertencia global.

🚨 *Advertencias actuales: ${userData.botWarns}/3*`,
          mentions: [`${targetNumber}@s.whatsapp.net`]
        }, { quoted: msg });
      }

    } catch (err) {
      console.log(`❌ Error en ${command}:`, err?.message || err);
      return sock.sendMessage(remoteJid, {
        text: `❌ Ocurrió un error ejecutando el comando ${command}.`
      }, { quoted: msg });
    }
  }
};
