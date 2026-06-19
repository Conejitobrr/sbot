'use strict';

const db = require('../lib/database');

// 🔥 Limpieza idéntica a la de tu admin.js para evitar números raros
function cleanJid(jid = '') {
  const value = String(jid || '');
  if (!value) return '';

  if (value.includes('@')) {
    const [user, server] = value.split('@');
    return `${user.split(':')[0]}@${server}`;
  }
  return value.split(':')[0];
}

function number(jid = '') {
  return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

function getTarget(msg, args) {
  const ctxInfo = msg.message?.extendedTextMessage?.contextInfo || 
                  msg.message?.imageMessage?.contextInfo || 
                  msg.message?.videoMessage?.contextInfo;

  // 1. Respondiendo a un mensaje
  if (ctxInfo?.participant) {
    return cleanJid(ctxInfo.participant);
  }

  // 2. Mención directa
  if (ctxInfo?.mentionedJid?.length > 0) {
    return cleanJid(ctxInfo.mentionedJid[0]);
  }

  // 3. Número escrito
  if (args && args.length > 0) {
    const textNum = args.join('').replace(/\D/g, '');
    if (textNum.length >= 8) {
      return `${textNum}@s.whatsapp.net`;
    }
  }

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
      isOwner,
      args
    } = ctx;

    try {
      // 🛑 Solo el Owner puede dar advertencias de baneo
      if (!isOwner) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Solo el Owner puede usar el sistema de advertencias globales.'
        }, { quoted: msg });
      }

      const targetJid = getTarget(msg, args);

      if (!targetJid) {
        return sock.sendMessage(remoteJid, {
          text: `❌ Debes mencionar, responder o escribir el número del usuario.\n\nEjemplos:\n.${command} @usuario`
        }, { quoted: msg });
      }

      const targetNumber = number(targetJid);
      const senderNumber = number(ctx.sender);
      
      // No puedes advertirte a ti mismo
      if (targetNumber === senderNumber) {
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
          // Lo baneamos
          await db.banUser(targetNumber);
          
          // Reiniciamos las advertencias por si lo desbaneas luego
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
