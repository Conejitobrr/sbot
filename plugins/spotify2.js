'use strict';

const yts = require('yt-search');

global.spotify2Selections = global.spotify2Selections || new Map();

module.exports = {
commands: ['spotify2'],

async execute({
sock,
remoteJid,
args,
msg,
sender
}) {

const query = args.join(' ').trim();

if (!query) {
return sock.sendMessage(
remoteJid,
{
text: '❌ Uso:\n.spotify2 canción'
},
{ quoted: msg }
);
}

const search = await yts(query);

const videos = (search.videos || [])
.filter(v => v.url)
.slice(0, 50);

if (!videos.length) {
return sock.sendMessage(
remoteJid,
{
text: '❌ No encontré resultados.'
},
{ quoted: msg }
);
}

global.spotify2Selections.set(sender, {
page: 0,
results: videos
});

const first = videos.slice(0, 5);

let text =
`🎵 *Resultados encontrados*\n\n`;

first.forEach((v, i) => {
text +=
`${i + 1}. ${v.title}
⏱️ ${v.timestamp}

`;
});

text +=
`Responde a ESTE mensaje con:

1
2
3
4
5

o escribe:

siguiente`;

const sent = await sock.sendMessage(
remoteJid,
{ text },
{ quoted: msg }
);

global.spotify2Selections.get(sender).messageId =
sent.key.id;
}
};
