'use strict';

module.exports = {
  commands: ['hack'],

  async execute({ sock, remoteJid, msg }) {

    const target =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
      msg.key.participant ||
      msg.key.remoteJid;

    const name = '@' + target.split('@')[0];

    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    // 🔥 INICIO
    await sock.sendMessage(remoteJid, {
      text: `🕵️ Iniciando protocolo de intrusión...\nObjetivo: ${name}`,
      mentions: [target]
    }, { quoted: msg });

    await delay(1200);

    await sock.sendMessage(remoteJid, { text: '📡 Conectando a servidores de WhatsApp...' });
    await delay(1200);

    await sock.sendMessage(remoteJid, { text: '🔍 Escaneando dispositivo...' });
    await delay(1200);

    await sock.sendMessage(remoteJid, { text: '📂 Accediendo a base de datos...' });
    await delay(1200);

    await sock.sendMessage(remoteJid, { text: '💬 Leyendo conversaciones privadas...' });
    await delay(1200);

    await sock.sendMessage(remoteJid, { text: '🔐 Rompiendo cifrado end-to-end...' });
    await delay(1200);

    // 🔥 DATOS FALSOS
    const fakeIP = `${rand(10,255)}.${rand(0,255)}.${rand(0,255)}.${rand(0,255)}`;
    const fakeID = Math.random().toString(36).substring(2, 12).toUpperCase();
    const device = pick(['Android','iPhone','Windows','Linux']);
    const location = pick(['Perú','México','Colombia','España','Argentina']);
    const battery = rand(5, 100);
    const number = target.split('@')[0];

    await sock.sendMessage(remoteJid, {
      text:
`⚠️ ACCESO OBTENIDO

👤 Usuario: ${name}
📞 Número: +${number}
🌐 IP: ${fakeIP}
🧬 ID: ${fakeID}
📱 Dispositivo: ${device}
🔋 Batería: ${battery}%
📍 Ubicación: ${location}`,
      mentions: [target]
    });

    await delay(1500);

    // 🔥 FILTRACIÓN
    await sock.sendMessage(remoteJid, {
      text:
`📂 Extrayendo archivos...

📸 Fotos privadas: 127
🎥 Videos: 38
💬 Chats: 542
🔑 Contraseñas: 12`
    });

    await delay(1500);

    // 🔥 FAKE PASSWORD
    const pass = Math.random().toString(36).slice(-8);

    await sock.sendMessage(remoteJid, {
      text: `🔑 Contraseña encontrada:\n${pass}`
    });

    await delay(1200);

    // 🔥 FINAL IMPACTO
    await sock.sendMessage(remoteJid, {
      text:
`💀 HACK COMPLETADO

Todos los datos han sido enviados al servidor.

🛰️ Transferencia finalizada...
📡 Desconectando...`
    });

    await delay(1500);

    // 😂 REMATE
    await sock.sendMessage(remoteJid, {
      text: `😂 Tranquilo ${name}, es broma`,
      mentions: [target]
    });

    // helpers
    function rand(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function pick(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

  }
};
