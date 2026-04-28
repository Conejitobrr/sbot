'use strict';

module.exports = {
  commands: ['top'],

  async execute(ctx) {
    const { sock, remoteJid, msg, args } = ctx;

    const text = args.join(' ');
    if (!text) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Ejemplo:\n.top guapos'
      }, { quoted: msg });
    }

    // 🔥 OBTENER PARTICIPANTES DEL GRUPO
    let metadata;
    try {
      metadata = await sock.groupMetadata(remoteJid);
    } catch {
      return sock.sendMessage(remoteJid, {
        text: '❌ Este comando solo funciona en grupos'
      }, { quoted: msg });
    }

    const participants = metadata.participants.map(v => v.id);

    // 🔥 FUNCIÓN RANDOM
    const pick = () => participants[Math.floor(Math.random() * participants.length)];

    const a = pick();
    const b = pick();
    const c = pick();
    const d = pick();
    const e = pick();
    const f = pick();
    const g = pick();
    const h = pick();
    const i = pick();
    const j = pick();

    const emojiList = ['🤓','😅','😂','😳','😎','🥵','😱','🤑','🙄','💩','🍑','🤨','🥴','🔥','👇🏻','😔','👀','🌚'];
    const emoji = emojiList[Math.floor(Math.random() * emojiList.length)];

    const tag = (u) => '@' + u.split('@')[0];

    const topText =
`*${emoji} TOP 10 ${text.toUpperCase()} ${emoji}*

🥇 1. ${tag(a)}
🥈 2. ${tag(b)}
🥉 3. ${tag(c)}
4. ${tag(d)}
5. ${tag(e)}
6. ${tag(f)}
7. ${tag(g)}
8. ${tag(h)}
9. ${tag(i)}
10. ${tag(j)}`;

    // 🔥 ENVIAR MENSAJE CON MENCIONES
    await sock.sendMessage(remoteJid, {
      text: topText,
      mentions: [a,b,c,d,e,f,g,h,i,j]
    }, { quoted: msg });

    // 🔥 AUDIO RANDOM (OPCIONAL)
    const k = Math.floor(Math.random() * 70);
    const vn = `https://hansxd.nasihosting.com/sound/sound${k}.mp3`;

    await sock.sendMessage(remoteJid, {
      audio: { url: vn },
      mimetype: 'audio/mpeg',
      ptt: true
    }, { quoted: msg });

  }
};
