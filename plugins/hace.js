'use strict';

module.exports = {
  commands: ['hack'],

  async execute({ sock, remoteJid, msg }) {

    const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.key.participant || msg.key.remoteJid;

    const name = '@' + target.split('@')[0];

    const steps = [
      '🟢 Iniciando hackeo...',
      '📡 Conectando a WhatsApp...',
      '📂 Accediendo a archivos...',
      '🔍 Buscando fotos...',
      '💬 Leyendo chats...',
      '🔐 Descifrando contraseñas...',
      '💀 Hackeo completado'
    ];

    let sent = await sock.sendMessage(remoteJid, {
      text: `🕵️ Hackeando a ${name}...`,
      mentions: [target]
    }, { quoted: msg });

    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 1200));

      await sock.sendMessage(remoteJid, {
        text: steps[i],
        edit: sent.key
      }).catch(() => {});
    }

    await sock.sendMessage(remoteJid, {
      text: `💀 ${name} hackeado exitosamente`,
      mentions: [target]
    });
  }
};
