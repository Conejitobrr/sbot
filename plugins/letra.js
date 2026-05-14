'use strict';

const axios = require('axios');
const yts = require('yt-search');

function cleanText(text = '') {
  return String(text)
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/official video/ig, '')
    .replace(/official audio/ig, '')
    .replace(/lyrics/ig, '')
    .replace(/letra/ig, '')
    .replace(/video oficial/ig, '')
    .replace(/audio oficial/ig, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitArtistTitle(title = '') {
  const clean = cleanText(title);

  if (clean.includes(' - ')) {
    const [artist, ...rest] = clean.split(' - ');
    return {
      artist: artist.trim(),
      title: rest.join(' - ').trim()
    };
  }

  if (clean.includes(' – ')) {
    const [artist, ...rest] = clean.split(' – ');
    return {
      artist: artist.trim(),
      title: rest.join(' – ').trim()
    };
  }

  return {
    artist: '',
    title: clean
  };
}

function cutLyrics(text = '', max = 3500) {
  const lyrics = String(text || '').trim();

  if (lyrics.length <= max) return lyrics;

  return lyrics.slice(0, max) + '\n\n⚠️ Letra muy larga, se envió recortada.';
}

async function searchYouTube(query) {
  const res = await yts(query);

  if (!res.videos?.length) return null;

  return (
    res.videos.find(v =>
      v.title &&
      !v.title.toLowerCase().includes('mix') &&
      !v.title.toLowerCase().includes('playlist')
    ) || res.videos[0]
  );
}

async function getLyricsFromOvh(artist, title) {
  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;

  const res = await axios.get(url, {
    timeout: 15000
  });

  return res.data?.lyrics || '';
}

module.exports = {
  commands: ['letra', 'lyrics'],

  async execute({ sock, remoteJid, args, msg }) {
    try {
      if (!args.length) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Escribe el nombre de una canción.

Ejemplos:
.letra bad bunny dakiti
.letra shakira hips dont lie
.lyrics adele hello`
        }, { quoted: msg });
      }

      const query = args.join(' ').trim();

      await sock.sendMessage(remoteJid, {
        text: '🔍 Buscando letra...'
      }, { quoted: msg });

      const video = await searchYouTube(query);

      if (!video) {
        return sock.sendMessage(remoteJid, {
          text: '❌ No encontré esa canción.'
        }, { quoted: msg });
      }

      let { artist, title } = splitArtistTitle(video.title);

      if (!artist || !title) {
        const parts = query.split('-');

        if (parts.length >= 2) {
          artist = parts[0].trim();
          title = parts.slice(1).join('-').trim();
        } else {
          artist = video.author?.name || '';
          title = cleanText(video.title);
        }
      }

      let lyrics = '';

      try {
        lyrics = await getLyricsFromOvh(artist, title);
      } catch {}

      if (!lyrics) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ No encontré la letra.

Prueba escribirlo así:
.letra artista - canción

Ejemplo:
.letra bad bunny - dakiti`
        }, { quoted: msg });
      }

      lyrics = cutLyrics(lyrics);

      return sock.sendMessage(remoteJid, {
        text:
`🎵 *${title}*
👤 *${artist}*

${lyrics}`
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en letra:', err?.message || err);

      return sock.sendMessage(remoteJid, {
        text: '❌ Error buscando la letra. Prueba con artista - canción.'
      }, { quoted: msg });
    }
  }
};
