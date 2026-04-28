'use strict';

module.exports = {
  commands: ['simpcard'],

  async execute(ctx) {
    const { sock, remoteJid, msg } = ctx;

    // 🔥 DETECTAR USUARIO
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    const mentioned = quoted?.mentionedJid || [];

    let who =
      mentioned[0] ||
      quoted?.participant ||
      (msg.key.fromMe ? sock.user.id : msg.key.participant || msg.key.remoteJid);

    // 🔥 FOTO DE PERFIL
    let avatar;
    try {
      avatar = await sock.profilePictureUrl(who, 'image');
    } catch {
      avatar = 'https://telegra.ph/file/24fa902ead26340f3df2c.png';
    }

    // 🔥 URL API
    const url = `https://some-random-api.com/canvas/simpcard?avatar=${encodeURIComponent(avatar)}`;

    // 🔥 ENVIAR IMAGEN
    await sock.sendMessage(remoteJid, {
      image: { url },
      caption: '💀 *¡¡TU RELIGIÓN ES SER UN SIMP!!*'
    }, { quoted: msg });

  }
};
