'use strict';

module.exports = {
  commands: ['hornycard', 'hornylicense'],

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

    // 🔥 URL DE LA API
    const url = `https://some-random-api.com/canvas/horny?avatar=${encodeURIComponent(avatar)}`;

    // 🔥 ENVIAR IMAGEN
    await sock.sendMessage(remoteJid, {
      image: { url },
      caption: '🥵 *TÚ ESTÁS HORNY* 🔥'
    }, { quoted: msg });

  }
};
