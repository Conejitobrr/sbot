'use strict';

module.exports = {
  commands: ['fake10'],

  async execute({ sock, msg, remoteJid, pushName, config }) {

    const text_ = 'Texto principal del mensaje';
    const img = 'https://qu.ax/Vmpl.jpg';
    const canal = 'Canal';
    const id = '120363160031023229@newsletter';
    const titulo_cita = 'Cita Titulo';
    const text_cita = 'Cita Texto';
    const img_cita = 'https://qu.ax/TPVV.jpg';
    const titulo_fkontak = 'josesiño Xd';
    const sourceUrl = 'https://example.com';

    const fkontak = {
      key: {
        participant: `0@s.whatsapp.net`,
        remoteJid: `6285600793871-1614953337@g.us`
      },
      message: {
        contactMessage: {
          displayName: titulo_fkontak,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:XL;${titulo_fkontak},;;;\nFN:${titulo_fkontak},\nitem1.TEL;waid=${msg.key.participant || msg.key.remoteJid}:${msg.key.participant || msg.key.remoteJid}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
          jpegThumbnail: null,
          thumbnail: null,
          sendEphemeral: true
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
            sourceUrl: sourceUrl,
            mediaType: 1,
            renderLargerThumbnail: false
          }
        }
      },
      { quoted: fkontak }
    );
  }
};
