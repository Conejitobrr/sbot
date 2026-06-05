'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const TEMP_DIR = path.join(process.cwd(), 'temp');

global.spotify2Selections = global.spotify2Selections || new Map();

async function downloadAudio(video) {

if (!fs.existsSync(TEMP_DIR)) {
fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const id = Date.now();

const output = path.join(
TEMP_DIR,
"spotify2_${id}.%(ext)s"
);

await execFileAsync('yt-dlp', [
'--extractor-args',
'youtube:player_client=android',

'--geo-bypass',
'--force-ipv4',

'--no-playlist',
'--ignore-errors',
'--no-warnings',

'-f',
'ba/b',

'-x',
'--audio-format',
'mp3',

'--audio-quality',
'320K',

'-o',
output,

video.url
]);

const downloaded =
fs.readdirSync(TEMP_DIR)
.find(f =>
f.startsWith("spotify2_${id}") &&
f.endsWith('.mp3')
);

if (!downloaded) {
throw new Error('No se descargó el audio');
}

const audioPath =
path.join(TEMP_DIR, downloaded);

const coverPath =
path.join(TEMP_DIR, "cover_${id}.jpg");

const finalPath =
path.join(TEMP_DIR, "final_${id}.mp3");

try {

const image = await axios.get(
video.thumbnail,
{
responseType: 'arraybuffer'
}
);

fs.writeFileSync(
coverPath,
image.data
);

const title =
(video.title || 'Canción')
.replace(/\n/g, ' ')
.trim();

const artist =
(video.author?.name || 'YouTube')
.replace(/\n/g, ' ')
.trim();

await execFileAsync('ffmpeg', [

'-i',
audioPath,

'-i',
coverPath,

'-map',
'0:a',

'-map',
'1',

'-c:a',
'libmp3lame',

'-b:a',
'320k',

'-id3v2_version',
'3',

'-metadata',
"title=${title}",

'-metadata',
"artist=${artist}",

'-metadata',
"album=${artist}",

'-metadata',
"album_artist=${artist}",

'-metadata',
'genre=Music',

'-metadata',
"date=${new Date().getFullYear()}",

'-metadata',
'comment=Downloaded by SiriusBot',

'-disposition:v',
'attached_pic',

'-y',

finalPath

]);

return {
audio: finalPath,
cover: coverPath,
title,
artist
};

} catch {

return {
audio: audioPath,
cover: null,
title: video.title,
artist: video.author?.name || 'YouTube'
};

}

}

module.exports = {

async onMessage({
sock,
msg,
body,
sender,
remoteJid
}) {

const replyId =
msg.message?.extendedTextMessage
?.contextInfo?.stanzaId;

if (!replyId) return;

const data =
global.spotify2Selections.get(sender);

if (!data) return;

if (replyId !== data.messageId) return;

const text =
String(body || '')
.trim()
.toLowerCase();

if (text === 'siguiente') {

data.page++;

const start =
data.page * 5;

const results =
data.results.slice(
start,
start + 5
);

if (!results.length) {

data.page--;

return sock.sendMessage(
remoteJid,
{
text: '❌ No hay más resultados.'
},
{ quoted: msg }
);

}

let message =
'🎵 Más resultados\n\n';

results.forEach((v, i) => {

message +=
`${i + 1}. ${v.title}
⏱️ ${v.timestamp}

`;

});

message +=
`Responde con:

1
2
3
4
5

o escribe:

siguiente`;

const sent =
await sock.sendMessage(
remoteJid,
{ text: message },
{ quoted: msg }
);

data.messageId =
sent.key.id;

return;

}

const num =
parseInt(text);

if (
isNaN(num) ||
num < 1 ||
num > 5
) return;

const index =
(data.page * 5)
+
(num - 1);

const video =
data.results[index];

if (!video) return;

global.spotify2Selections.delete(sender);

await sock.sendMessage(
remoteJid,
{
text:
`🎧 Descargando...

🎶 ${video.title}`
},
{ quoted: msg }
);

try {

const media =
await downloadAudio(video);

if (media.cover) {

await sock.sendMessage(
remoteJid,
{
image:
fs.readFileSync(media.cover),

caption:
`🎧 Spotify2

🎶 ${media.title}
👤 ${media.artist}
⏱️ ${video.timestamp || 'Desconocido'}`
},
{ quoted: msg }
);

}

await sock.sendMessage(
remoteJid,
{
audio:
fs.readFileSync(media.audio),

mimetype:
'audio/mpeg',

fileName:
"${media.title}.mp3",

ptt: false
},
{ quoted: msg }
);

try {

if (
media.audio &&
fs.existsSync(media.audio)
) {
fs.unlinkSync(media.audio);
}

if (
media.cover &&
fs.existsSync(media.cover)
) {
fs.unlinkSync(media.cover);
}

} catch {}

} catch (e) {

console.log(
'spotify2 error:',
e
);

await sock.sendMessage(
remoteJid,
{
text:
'❌ Error descargando la canción.'
},
{ quoted: msg }
);

}

}

};
