'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../lib/database');

module.exports = {
  async onMessage(ctx) {
    const { sock, remoteJid, body, sender, fromGroup, msg } = ctx;

    if (!body) return;

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

    const filePath = path.resolve(__dirname, '../media', audios[key]);

    console.log('🎧 AUDIO TRIGGER:', key);

    if (!fs.existsSync(filePath)) {
      console.log('❌ Audio no encontrado:', filePath);
      return;
    }

    try {
      await sock.sendMessage(
        remoteJid,
        {
          audio: fs.readFileSync(filePath),
          mimetype: 'audio/mpeg',
          ptt: true
        },
        { quoted: msg }
      );
    } catch (err) {
      console.log('❌ Error enviando audio:', err?.message || err);
    }
  }
};
