'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  commands: ['s'],

  async execute(ctx) {
    const { sock, msg, remoteJid } = ctx;

    try {
      // 🔥 detectar quoted o mensaje normal
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const message = quoted || msg.message;

      if (!message) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Envía o responde a una imagen/video'
        }, { quoted: msg });
      }

      let type = Object.keys(message)[0];

      // 🔥 fix para viewOnce (muy importante)
      if (type === 'viewOnceMessage') {
        const inner = message.viewOnceMessage.message;
        type = Object.keys(inner)[0];
        message[type] = inner[type];
      }

      if (!['imageMessage', 'videoMessage'].includes(type)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Usa .s con una imagen o video'
        }, { quoted: msg });
      }

      const media = message[type];

      // 📥 descargar media
      const stream = await downloadContentFromMessage(
        media,
        type === 'imageMessage' ? 'image' : 'video'
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // 📁 carpeta temp
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const isImage = type === 'imageMessage';

      // 🔥 nombres únicos (evita bugs en privado)
      const input = path.join(tempDir, `input_${Date.now()}.${isImage ? 'jpg' : 'mp4'}`);
      const output = path.join(tempDir, `output_${Date.now()}.webp`);

      fs.writeFileSync(input, buffer);

      // 🎬 ffmpeg (tu config original optimizada)
      const cmd = isImage
        ? `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -vcodec libwebp -q:v 60 -compression_level 6 -preset picture -loop 0 "${output}"`
        : `ffmpeg -y -i "${input}" -t 4 -vf "scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,fps=10,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -vcodec libwebp -fs 700k -loop 0 -an "${output}"`;

      exec(cmd, async (err) => {
        if (err) {
          console.log('❌ FFMPEG ERROR:', err);

          return sock.sendMessage(remoteJid, {
            text: '❌ Error al crear sticker'
          }, { quoted: msg });
        }

        try {
          const sticker = fs.readFileSync(output);

          await sock.sendMessage(remoteJid, {
            sticker
          }, { quoted: msg });

        } catch (e) {
          console.log('❌ SEND ERROR:', e);
        }

        // 🧹 limpiar
        try {
          fs.unlinkSync(input);
          fs.unlinkSync(output);
        } catch {}
      });

    } catch (err) {
      console.log('❌ GENERAL ERROR:', err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error general'
      }, { quoted: msg });
    }
  }
};
