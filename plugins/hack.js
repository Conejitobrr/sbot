'use strict';

module.exports = {
  commands: ['doxx','doxear','doxeame'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    const target =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
      msg.key.participant ||
      msg.key.remoteJid;

    const name = '@' + target.split('@')[0];

    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    // 🔥 INICIO
    await sock.sendMessage(remoteJid, {
      text: `☠️ INICIANDO DOXXEO...\n🎯 Objetivo: ${name}`,
      mentions: [target]
    }, { quoted: msg });

    const loading = [
      '《 █▒▒▒▒▒▒▒▒▒▒▒》10%',
      '《 ████▒▒▒▒▒▒▒▒》30%',
      '《 ███████▒▒▒▒▒》50%',
      '《 ██████████▒▒》80%',
      '《 ████████████》100%'
    ];

    for (let step of loading) {
      await delay(900);
      await sock.sendMessage(remoteJid, { text: step });
    }

    // 🔥 GENERADOR FAKE
    const fake = generateFake(target);

    await delay(1000);

    const result = `☠️ *DOXXEO COMPLETADO*

👤 Nombre: ${name}
🌐 IP: ${fake.ip}
🧬 ID: ${fake.id}
📡 IPV6: ${fake.ipv6}
📱 Dispositivo: ${fake.device}
📍 Ubicación: ${fake.location}

🔐 DATOS DE RED:
• MAC: ${fake.mac}
• ISP: ${fake.isp}
• DNS: ${fake.dns}
• GATEWAY: ${fake.gateway}

📂 SISTEMA:
• Puertos TCP: ${fake.tcp}
• Puertos UDP: ${fake.udp}
• Router: ${fake.router}
• Conexión: ${fake.connection}

📸 ACCESO:
• Cámara: ${fake.camera}

💀 Datos extraídos correctamente`;

    await sock.sendMessage(remoteJid, {
      text: result,
      mentions: [target]
    }, { quoted: msg });

    await delay(1500);

    // 😂 REMATE
    await sock.sendMessage(remoteJid, {
      text: `😂 Tranquilo ${name}, es solo una broma`,
      mentions: [target]
    });

    // 🔥 FUNCIONES
    function rand(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function pick(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    function generateFake(user) {
      const ip = `${rand(10,255)}.${rand(0,255)}.${rand(0,255)}.${rand(0,255)}`;

      return {
        ip,
        id: Math.random().toString(36).substring(2, 10).toUpperCase(),
        ipv6: `fe80:${rand(1000,9999).toString(16)}:${rand(1000,9999).toString(16)}::1`,
        device: pick(['Android','iPhone','Windows','Linux']),
        location: pick(['Perú','México','Colombia','España']),
        mac: `${rand(0,255).toString(16)}:${rand(0,255).toString(16)}:${rand(0,255).toString(16)}`,
        isp: pick(['Claro','Movistar','Entel','Bitel']),
        dns: `${rand(1,255)}.${rand(1,255)}.${rand(1,255)}.${rand(1,255)}`,
        gateway: `192.168.${rand(0,255)}.1`,
        tcp: rand(1000,9999),
        udp: rand(1000,9999),
        router: pick(['TP-Link','Cisco','Huawei']),
        connection: pick(['Privada','Pública','NAT']),
        camera: `http://${ip}/camera`
      };
    }
  }
};
