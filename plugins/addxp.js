'use strict';

const db = require('../lib/database');

// Función crucial para limpiar los códigos de dispositivo y que la DB lo entienda
function cleanNumber(jid = '') {
  return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

module.exports = {
  commands: ['addxp'],
  description: 'Añadir XP a un usuario o al bot (Owner)',

  async execute(ctx) {
    const {
      sock,
      remoteJid,
      msg,
      args,
      isOwner,
      botJid
    } = ctx;

    if (!isOwner) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Solo el owner puede usar este comando.'
      }, { quoted: msg });
    }

    let target;

    // 1. Mención (PRIORIDAD: Si mencionas a alguien, ignora a quién le respondes)
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // 2. Responder mensaje
    else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
      target = msg.message.extendedTextMessage.contextInfo.participant;
    }
    // 3. Atajo directo para darle XP al bot
    else if (args.includes('bot') || args.includes('Bot')) {
      target = botJid || sock.user?.id;
    }

    if (!target) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Debes mencionar, responder a alguien o poner "bot".\n\nEjemplos:\n.addxp @usuario 1000\n.addxp bot 1000'
      }, { quoted: msg });
    }

    const amount = parseInt(args.find(a => /^\d+$/.test(a)));

    if (!amount || amount <= 0) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Debes indicar una cantidad válida.\n\nEjemplo:\n.addxp @usuario 1000'
      }, { quoted: msg });
    }

    // LIMPIAMOS EL JID PARA LA BASE DE DATOS
    const userKey = cleanNumber(target);
    
    // 🔥 SOLUCIÓN: Reconstruimos el JID forzosamente limpio para que WhatsApp no se buguee
    const targetForMention = `${userKey}@s.whatsapp.net`;

    // Añadimos la experiencia al número limpio
    await db.addXP(userKey, amount);

    // Identificamos si se le dio al bot para dar un mensaje personalizado
    const isBotTarget = userKey === cleanNumber(botJid || sock.user?.id);
    const nameDisplay = isBotTarget ? 'SiriusBot 🤖' : `@${userKey}`;

    await sock.sendMessage(remoteJid, {
      text: `✅ XP añadida correctamente\n\nSe añadieron *${amount} XP* a ${nameDisplay}`,
      mentions: [targetForMention] // Ahora siempre usará el número limpio
    }, { quoted: msg });
  }
};
