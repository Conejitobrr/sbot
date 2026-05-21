'use strict';

module.exports = {
  commands: ['fake10'],

  async execute({ sock, msg, remoteJid, args }) {
    try {
      const input = args.join(' ').trim();

      const parts = input.split('|').map(v => v.trim());

      const text_ = parts[0] || 'Texto principal del mensaje';
      const titulo_cita = parts[1] || 'SiriusBot';
      const text_cita = parts[2] || 'Mensaje decorado de WhatsApp';
      const titulo_fkontak = parts[3] || 'SiriusBot';

      const img = 'https://qu.ax/Vmpl.jpg';
      const img_cita = 'https://qu.ax/TPVV.jpg';

      const canal = 'SiriusBot';
      const id = '120363160031023229@newsletter';
      const sourceUrl = 'https://example.com';

      const userJid = msg.key.participant || msg.key.remoteJid;

      const fkontak = {
        key: {
          fromMe: false,
          participant: '0@s.whatsapp.net',
          remoteJid
        },
        message: {
          contactMessage: {
            displayName: titulo_fkontak,
            vcard:
`BEGIN:VCARD
VERSION:3.0
FN:${titulo_fkontak}
TEL;waid=${String(userJid).split('@')[0]}:${String(userJid).split('@')[0]}
END:VCARD`
          }
        }
      };

      await sock.sendMessage(
        remoteJid,
        {
          image: { url: img },
          caption: text_,
          contextInfo: {
            forwardingScore: 99,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterName: canal,
              newsletterJid: id
            },
            externalAdReply: {
              title: titulo_cita,
              body: text_cita,
              thumbnailUrl: img_cita,
              sourceUrl,
              mediaType: 1,
              renderLargerThumbnail: false
            }
          }
        },
        { quoted: fkontak }
      );

    } catch (err) {
      console.log('❌ Error en fake10:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error enviando mensaje decorado.'
      }, { quoted: msg });
    }
  }
};
