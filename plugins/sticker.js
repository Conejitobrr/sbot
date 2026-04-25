'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const db = require('../lib/database');

let events = null;
try {
  events = require('../lib/events');
} catch {}

module.exports = {
  commands: ['s'],

  async execute(ctx) {
    const { sock, msg, remoteJid, sender } = ctx;

    try {
      // 📌 detectar mensaje citado correctamente (incluye fromMe)
      const quoted = msg.message?.extendedTextMessage?.contextInfo;

      let message;

      if (quoted?.quotedMessage) {
        message = quoted.quotedMessage;
      } else {
        message = msg.message;
      }

      if (!message) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Envía o responde a una imagen/video'
        }, { quoted: msg });
      }

      // 📌 detectar tipo real
      const type = Object.keys(message)[0];

      if (!['imageMessage', 'videoMessage'].includes(type)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Usa .s con una imagen o video'
        }, { quoted: msg });
      }

      const media = message[type];

      // 🔥 IMPORTANTE: asegurar url o mediaKey
      if (!media || (!media.url && !media.mediaKey)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No se pudo obtener el archivo'
        }, { quoted: msg });
      }

      // 📥 descargar correctamente (fix privado/fromMe)
      const stream = await downloadContentFromMessage(
        media,
        type === 'imageMessage' ? 'image' : 'video'
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      if (!buffer.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Error descargando el archivo'
        }, { quoted: msg });
      }

      // 📁 temp
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const isImage = type === 'imageMessage';

      const input = path.join(tempDir, `input_${Date.now()}.${isImage ? 'jpg' : 'mp4'}`);
      const output = path.join(tempDir, `output_${Date.now()}.webp`);

      fs.writeFileSync(input, buffer);

      // 🎬 ffmpeg
      const cmd = isImage
        ? `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -vcodec libwebp -q:v 60 -compression_level 6 -preset picture -loop 0 "${output}"`
        : `ffmpeg -y -i "${input}" -t 5 -vf "scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,fps=10,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -vcodec libwebp -fs 700k -loop 0 -an "${output}"`;

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

          // ⭐ XP
          let xp = Math.floor(Math.random() * 10) + 5;

          if (events?.state?.active?.type === 'double') {
            xp *= 2;
          }

          await db.addXP(sender, xp);

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
