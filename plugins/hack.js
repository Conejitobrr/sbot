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
      text: `🕵️‍♂️ [SYSTEM] Iniciando ataque...\n🎯 Objetivo: ${name}`,
      mentions: [target]
    }, { quoted: msg });

    await delay(1000);

    const terminal = [
      'root@server:~# access whatsapp --force',
      'root@server:~# bypass encryption...',
      'root@server:~# decrypting keys...',
      'root@server:~# extracting database...',
      'root@server:~# downloading media...',
      'root@server:~# injecting payload...',
      'root@server:~# access granted ✔'
    ];

    for (let line of terminal) {
      await sock.sendMessage(remoteJid, { text: '```' + line + '```' });
      await delay(900);
    }

    // 🔥 DATOS FAKE REALISTAS
    const fakeIP = `${rand(100,255)}.${rand(0,255)}.${rand(0,255)}.${rand(0,255)}`;
    const fakeID = Math.random().toString(36).substring(2, 12).toUpperCase();
    const device = pick(['Android 13','iOS 17','Windows 11','Linux']);
    const location = pick([
      'Lima, Perú',
      'CDMX, México',
      'Bogotá, Colombia',
      'Madrid, España'
    ]);
    const battery = rand(10, 100);
    const number = target.split('@')[0];

    await delay(1200);

    await sock.sendMessage(remoteJid, {
      text:
`⚠️ DATA BREACH DETECTED

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

    // 🔥 IMAGEN HACKER
    await sock.sendMessage(remoteJid, {
      image: { url: 'https://i.imgur.com/8QZ7Z9F.jpg' },
      caption: '🧠 Accediendo al núcleo del sistema...'
    });

    await delay(1500);

    // 🔥 FILTRACIÓN
    await sock.sendMessage(remoteJid, {
      text:
`📂 Extracción completada:

📸 Fotos: ${rand(50,200)}
🎥 Videos: ${rand(10,80)}
💬 Chats: ${rand(200,900)}
🔑 Passwords: ${rand(5,20)}`
    });

    await delay(1200);

    // 🔥 PASSWORD
    const pass = Math.random().toString(36).slice(-10);

    await sock.sendMessage(remoteJid, {
      text: `🔑 Password encontrada:\n${pass}`
    });

    await delay(1200);

    // 🔥 AUDIO (OPCIONAL)
    await sock.sendMessage(remoteJid, {
      audio: { url: 'https://files.catbox.moe/9l4q0h.mp3' },
      mimetype: 'audio/mpeg',
      ptt: true
    }).catch(() => {});

    await delay(1500);

    // 🔥 FINAL
    await sock.sendMessage(remoteJid, {
      text:
`💀 HACK COMPLETADO

📡 Datos enviados correctamente
🛰️ Conexión cerrada

☠️ Sistema comprometido`
    });

    await delay(1200);

    // 😂 REMATE FINAL
    await sock.sendMessage(remoteJid, {
      text: `😂 Relax ${name}, es una broma`,
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
