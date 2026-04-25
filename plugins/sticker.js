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
      // 🔥 Detectar mensaje citado o propio
      let message =
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
        msg.message;

      // 🔥 FIX PRIVADO (ephemeral + viewOnce)
      if (message?.ephemeralMessage) {
        message = message.ephemeralMessage.message;
      }

      if (message?.viewOnceMessage) {
        message = message.viewOnceMessage.message;
      }

      if (!message) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Envía o responde a una imagen o video'
        }, { quoted: msg });
      }

      const type = Object.keys(message)[0];

      if (!['imageMessage', 'videoMessage'].includes(type)) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Usa *.s* con imagen o video'
        }, { quoted: msg });
      }

      const media = message[type];

      // 📥 Descargar
      const stream = await downloadContentFromMessage(
        media,
        type === 'imageMessage' ? 'image' : 'video'
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // 📁 Temp
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const isImage = type === 'imageMessage';

      const input = path.join(tempDir, `input_${Date.now()}.${isImage ? 'jpg' : 'mp4'}`);
      const output = path.join(tempDir, `output_${Date.now()}.webp`);

      fs.writeFileSync(input, buffer);

      // 🎬 FFMPEG
      const cmd = isImage
        ? `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -vcodec libwebp -loop 0 -preset default -an -vsync 0 "${output}"`
        : `ffmpeg -y -i "${input}" -t 5 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=10,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -vcodec libwebp -loop 0 -an -vsync 0 "${output}"`;

      exec(cmd, async (err) => {
        if (err) {
          console.log('❌ FFMPEG ERROR:', err);
          return sock.sendMessage(remoteJid, {
            text: '❌ Error creando sticker'
          }, { quoted: msg });
        }

        try {
          const sticker = fs.readFileSync(output);

          await sock.sendMessage(remoteJid, {
            sticker
          }, { quoted: msg });

          // ⭐ XP
          let xp = Math.floor(Math.random() * 10) + 5;

          if (events?.isActive?.('double')) {
            xp *= events.getMultiplier?.() || 2;
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
        text: '❌ Error inesperado'
      }, { quoted: msg });
    }
  }
};
