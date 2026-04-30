'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const db = require('../lib/database');

module.exports = {
  async onMessage(ctx) {
    const { sock, remoteJid, body, sender, fromGroup, msg } = ctx;

    if (!body) return;

    // 🔥 ACTIVADO / DESACTIVADO
    try {
      if (fromGroup) {
        const enabled = await db.getGroupSetting(remoteJid, 'audios');
        if (enabled === false) return;
      } else {
        const enabled = await db.getUserSetting(sender, 'audios');
        if (enabled === false) return;
      }
    } catch (e) {
      console.log('❌ Error DB audios:', e?.message || e);
    }

    const text = body.toLowerCase();

    const audios = {
      hola: 'hola.mp3',
      autoestima: 'Autoestima.mp3'
    };

    const key = Object.keys(audios).find(k => text.includes(k));
    if (!key) return;

    const input = path.resolve(__dirname, '../media', audios[key]);

    console.log('🎧 AUDIO TRIGGER:', key);

    if (!fs.existsSync(input)) {
      console.log('❌ Audio no encontrado:', input);
      return;
    }

    // 📁 TEMP
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const output = path.join(tempDir, `voice_${Date.now()}.ogg`);

    // 🔥 CONVERTIR A NOTA DE VOZ REAL
    const cmd = `
ffmpeg -y -i "${input}" \
-vn -c:a libopus -b:a 48k \
-ar 48000 -ac 1 \
"${output}"
`;

    exec(cmd, async (err) => {
      if (err) {
        console.log('❌ FFMPEG ERROR:', err);

        return sock.sendMessage(
          remoteJid,
          { text: '❌ Error convirtiendo audio' },
          { quoted: msg }
        );
      }

      try {
        await sock.sendMessage(
          remoteJid,
          {
            audio: fs.readFileSync(output),
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
          },
          { quoted: msg }
        );
      } catch (e) {
        console.log('❌ Error enviando audio:', e);
      }

      // 🧹 limpiar
      try {
        fs.unlinkSync(output);
      } catch {}
    });
  }
};
