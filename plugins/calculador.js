'use strict';

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function number(jid = '') {
  return cleanJid(jid)
    .split('@')[0]
    .replace(/\D/g, '');
}

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

function getPercent(max = 500) {
  return Math.floor(Math.random() * (max + 1));
}

function getTargetText(args = [], mentioned = []) {
  if (mentioned.length) {
    return `@${number(mentioned[0])}`;
  }

  return args.join(' ').trim();
}

function upperText(text = '') {
  return String(text || '').toUpperCase();
}

const RESPONSES = {
  gay2: target => `_*${upperText(target)}* *ES 🏳️‍🌈* *${getPercent()}%* *QUE PUTAZOOO*_`,

  lesbiana: target => `_*${upperText(target)}* *ES 🏳️‍🌈* *${getPercent()}%* *DE ENERGÍA ARCOÍRIS, QUE LESBIANA*_`,

  pajero: target => `_*${upperText(target)}* *ES 😏💦* *${getPercent()}%* *PAJERO*_`,

  pajera: target => `_*${upperText(target)}* *ES 😏💦* *${getPercent()}%* *PAJERA*_`,

  puto: target => `_*${upperText(target)}* *ES 🔥* *${getPercent()}%* *MÁS INFORMACIÓN A SU PRIVADO 🔥🥵 XD*_`,

  puta: target => `_*${upperText(target)}* *ES 🔥* *${getPercent()}%* *MÁS INFORMACIÓN A SU PRIVADO 🔥🥵 XD*_`,

  manco: target => `_*${upperText(target)}* *ES* *${getPercent()}%* *MANCO 💩*_`,

  manca: target => `_*${upperText(target)}* *ES* *${getPercent()}%* *MANCA 💩*_`,

  rata: target => `_*${upperText(target)}* *ES* *${getPercent()}%* *RATA 🐁 COME QUESO 🧀*_`,

  prostituto: target => `_*${upperText(target)}* *ES 🫦* *${getPercent()}%* *🫦👅, QUIEN QUIERE DE SUS SERVICIOS? XD*_`,

  prostituta: target => `_*${upperText(target)}* *ES 🫦* *${getPercent()}%* *🫦👅, QUIEN QUIERE DE SUS SERVICIOS? XD*_`
};

module.exports = {
  commands: [
    'gay2',
    'lesbiana',
    'pajero',
    'pajera',
    'puto',
    'puta',
    'manco',
    'manca',
    'rata',
    'prostituta',
    'prostituto'
  ],

  async execute(ctx) {
    const { sock, remoteJid, msg, args, command } = ctx;

    try {
      const mentioned = getMentioned(msg).map(cleanJid);
      const target = getTargetText(args, mentioned);

      if (!target) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Ingresa el @tag de algún participante o el nombre de la persona.

Ejemplo:
.${command} @usuario
.${command} Sirius`
        }, { quoted: msg });
      }

      const response = RESPONSES[command];

      if (!response) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Comando no disponible.'
        }, { quoted: msg });
      }

      return sock.sendMessage(remoteJid, {
        text: response(target),
        mentions: mentioned
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en bromas:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Error usando el comando.'
      }, { quoted: msg });
    }
  }
};
