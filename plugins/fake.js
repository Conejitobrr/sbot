'use strict';

module.exports = {
  commands: ['fake10'],

  async execute(ctx) {
    const { sock, msg, remoteJid, sender } = ctx;

    try {
      // 🔧 CONFIG
      const text_ = 'Texto';
      const img = 'https://qu.ax/Vmpl.jpg';
      const canal = 'Canal';
      const id = '120363160031023229@newsletter';
      const titulo_cita = 'Cita Titulo';
      const text_cita = 'Cita Texto';
      const img_cita = 'https://qu.ax/TPVV.jpg';
      const titulo_fkontak = 'Bot1';

      // 📇 fake contacto (compatible contigo)
      const fkontak = {
        key: {
          participant: '0@s.whatsapp.net',
          remoteJid: remoteJid
        },
        message: {
          contactMessage: {
            displayName: titulo_fkontak,
            vcard: `BEGIN:VCARD
VERSION:3.0
N:XL;${titulo_fkontak},;;;
FN:${titulo_fkontak}
item1.TEL;waid=${sender.split('@')[0]}:${sender.split('@')[0]}
item1.X-ABLabel:Ponsel
END:VCARD`
          }
        }
      };

      // 🚀 MENSAJE
      await sock.sendMessage(remoteJid, {
        image: { url: img },
        caption: text_,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterName: canal,
            newsletterJid: id
          },
          externalAdReply: {
            title: titulo_cita,
            body: text_cita,
            thumbnailUrl: img_cita,

            // 🔥 FIX CRÍTICO (evita freeze/crash)
            sourceUrl: 'https://example.com',

            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
      }, { quoted: fkontak });

    } catch (err) {
      console.log('❌ fake10 error:', err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error en fake10'
      }, { quoted: msg });
    }
  }
};
