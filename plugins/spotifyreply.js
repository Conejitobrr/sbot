'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const TEMP_DIR = path.join(process.cwd(), 'temp');

global.spotify2Selections = global.spotify2Selections || new Map();

async function downloadAudio(video) {

if (!fs.existsSync(TEMP_DIR)) {
fs.mkdirSync(TEMP_DIR,{recursive:true});
}

const id = Date.now();

const output =
path.join(
TEMP_DIR,
`spotify2_${id}.%(ext)s`
);

await execFileAsync('yt-dlp',[
'--extractor-args',
'youtube:player_client=android',

'--geo-bypass',
'--force-ipv4',

'-f',
'ba/b',

'-x',
'--audio-format',
'mp3',

'-o',
output,

video.url
]);

const file =
fs.readdirSync(TEMP_DIR)
.find(f =>
f.startsWith(`spotify2_${id}`)
&& f.endsWith('.mp3')
);

return path.join(TEMP_DIR,file);
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
text:'❌ No hay más resultados.'
},
{ quoted: msg }
);
}

let message =
`🎵 *Más resultados*\n\n`;

results.forEach((v,i)=>{

message +=
`${i+1}. ${v.title}
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

o siguiente`;

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
isNaN(num)
|| num < 1
|| num > 5
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

${video.title}`
},
{ quoted: msg }
);

const file =
await downloadAudio(video);

await sock.sendMessage(
remoteJid,
{
audio:
fs.readFileSync(file),
mimetype:
'audio/mpeg',
fileName:
`${video.title}.mp3`
},
{ quoted: msg }
);

try {
fs.unlinkSync(file);
} catch {}
}
};
