'use strict';

module.exports = {
  commands: ['formarpareja'],

  async execute(ctx) {
    const { sock, msg, remoteJid, fromGroup } = ctx;

    if (!fromGroup) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Este comando solo funciona en grupos'
      }, { quoted: msg });
    }

    try {
      // 🔥 obtener participantes del grupo
      const metadata = await sock.groupMetadata(remoteJid);
      const participants = metadata.participants.map(p => p.id);

      if (participants.length < 2) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No hay suficientes personas en el grupo'
        }, { quoted: msg });
      }

      // 🔥 función random
      const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

      // 🔥 elegir 2 personas distintas
      const a = getRandom(participants);
      let b;

      do {
        b = getRandom(participants);
      } while (b === a);

      // 🔥 formato @usuario
      const toM = (jid) => '@' + jid.split('@')[0];

      const text = `*${toM(a)}, 𝙳𝙴𝙱𝙴𝚁𝙸𝙰𝚂 𝙲𝙰𝚂𝙰𝚁𝚃𝙴 💍 𝙲𝙾𝙽 ${toM(b)}, 𝙷𝙰𝙲𝙴𝙽 𝚄𝙽𝙰 𝙱𝚄𝙴𝙽𝙰 𝙿𝙰𝚁𝙴𝙹𝙰 💓*`;

      await sock.sendMessage(remoteJid, {
        text,
        mentions: [a, b]
      }, { quoted: msg });

    } catch (e) {
      console.log('❌ ERROR formarpareja:', e);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error al formar la pareja'
      }, { quoted: msg });
    }
  }
};
