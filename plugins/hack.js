'use strict';

const { performance } = require('perf_hooks');

module.exports = {
  commands: ['doxear', 'doxxeo', 'doxeo'],

  async execute(ctx) {
    const { sock, msg, remoteJid, sender, body } = ctx;

    const start = performance.now();
    const end = performance.now();
    const executionTime = (end - start).toFixed(2);

    const text = (body && typeof body === 'string') ? body.trim() : '';

    // 🔥 detectar mencionado
    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    // 🔥 detectar reply
    const quotedSender =
      msg.message?.extendedTextMessage?.contextInfo?.participant || null;

    // 🔥 prioridad: mencionado > reply > yo
    const target = mentioned[0] || quotedSender || sender;

    // 🔥 nombre visible correcto (@usuario)
    const nameTag = target ? `@${target.split('@')[0]}` : 'Desconocido';

    function randIP() {
      return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    }

    function getRandomValue(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    const ipAddress = randIP();

    const fakeData = {
      name_tag: nameTag,
      ip: randIP(),
      fakeCameraLink: `http://${ipAddress}.com/camera-feed`,
      n: Math.floor(Math.random() * 100000),
      w: (Math.random() * (20 - 10) + 10).toFixed(4),
      ssNumber: Math.floor(Math.random() * 10000000000000000),
      ipv6: `fe80:${(Math.random() * 65535).toString(16)}:${(Math.random() * 65535).toString(16)}:${(Math.random() * 65535).toString(16)}:${(Math.random() * 65535).toString(16)}%${Math.floor(Math.random() * 100)}`,
      upnp: getRandomValue(['Enabled', 'Disabled']),
      dmz: randIP(),
      mac: Array.from({ length: 6 }, () =>
        Math.floor(Math.random() * 256).toString(16).toUpperCase()
      ).join(':'),
      isp: getRandomValue(['Ucom universal', 'ISP Co', 'Internet Solutions Inc']),
      dns: randIP(),
      altDns: randIP(),
      dnsSuffix: getRandomValue(['Dlink', 'DNS', 'ISPsuffix']),
      wan: randIP(),
      wanType: getRandomValue(['private nat', 'public nat', 'Dynamic IP']),
      gateway: `192.${Math.floor(Math.random() * 256)}.0.1`,
      subnetMask: `255.255.${Math.floor(Math.random() * 256)}.0`,
      udpOpenPorts: `${Math.floor(Math.random() * 10000)}.${Math.floor(Math.random() * 10000)}`,
      tcpOpenPorts: `${Math.floor(Math.random() * 10000)}`,
      routerVendor: getRandomValue(['ERICCSON', 'TPLINK', 'Cisco']),
      deviceVendor: getRandomValue(['WIN32-X', 'Device Co', 'SecureTech']),
      connectionType: getRandomValue(['TPLINK COMPANY', 'ISP Connect', 'Home Network']),
      icmphops: `192.${Math.floor(Math.random() * 256)}.0.1 192.${Math.floor(Math.random() * 256)}.1.1`,
      http: `192.168.${Math.floor(Math.random() * 256)}.1:433-->92.28.211.234:80`,
      http2: `192.168.${Math.floor(Math.random() * 256)}.625-->92.28.211.455:80`,
      http3: `192.168.${Math.floor(Math.random() * 256)}.817-->92.28.211.8:971`,
      udp: `192.168.${Math.floor(Math.random() * 256)}.452-->92.28.211.7265288`,
      tcp1: `192.168.${Math.floor(Math.random() * 256)}.682-->92.28.211.62227.7`,
      tcp2: `192.168.${Math.floor(Math.random() * 256)}.725-->92.28.211.67wu2`,
      tcp3: `192.168.${Math.floor(Math.random() * 256)}.629-->92.28.211.167:8615`,
      externalMac: Array.from({ length: 6 }, () =>
        Math.floor(Math.random() * 256).toString(16).toUpperCase()
      ).join(':'),
      modemJumps: Math.floor(Math.random() * 100)
    };

    const doxeo = `*[ ✔ ] Persona doxxeada con éxito.*

*—◉ Doxxeo realizado en:*
*◉ ${executionTime} segundos.*

*—◉ Resultados obtenidos:*

*Nombre:* ${fakeData.name_tag}
*Ip:* ${fakeData.ip}
*ISP:* ${fakeData.isp}
*MAC:* ${fakeData.mac}
*DNS:* ${fakeData.dns}
*WAN:* ${fakeData.wan}
*GATEWAY:* ${fakeData.gateway}
*DEVICE:* ${fakeData.deviceVendor}
*CONNECTION:* ${fakeData.connectionType}
*HTTP:* ${fakeData.http}
*TCP:* ${fakeData.tcp1}
*MAC EXT:* ${fakeData.externalMac}
*MODEM JUMPS:* ${fakeData.modemJumps}`;

    const loading = [
      "《 █▒▒▒▒▒▒▒▒▒▒▒》10%",
      "《 ████▒▒▒▒▒▒▒▒》30%",
      "《 ███████▒▒▒▒▒》50%",
      "《 ██████████▒▒》80%",
      "《 ████████████》100%"
    ];

    const sent = await sock.sendMessage(remoteJid, {
      text: '*☠ ¡¡INICIANDO DOXXEO!! ☠*'
    }, { quoted: msg });

    for (let i = 0; i < loading.length; i++) {
      await new Promise(r => setTimeout(r, 1000));

      await sock.sendMessage(remoteJid, {
        text: loading[i],
        edit: sent.key
      });
    }

    await sock.sendMessage(remoteJid, {
      text: doxeo,
      edit: sent.key,
      mentions: [target] // 🔥 CLAVE
    });
  }
};
