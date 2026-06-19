'use strict';

const fs = require('fs');
const path = require('path');

// Intentamos cargar tu base de datos para dar XP de regalo de bodas
let db = null;
try {
  db = require('../lib/database');
} catch (e) {
  console.log('No se pudo cargar la base de datos en matrimonio.js');
}

const DB_PATH = path.join(process.cwd(), 'lib', 'marriages.json');
const PROPOSALS = new Map();

function ensureDB() {
  const dir = path.dirname(DB_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({
      marriages: {}
    }, null, 2));
  }
}

function loadDB() {
  ensureDB();
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8') || '{}');
  } catch {
    return { marriages: {} };
  }
}

function saveDB(data) {
  ensureDB();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function number(jid = '') {
  return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

function getPartner(data, user) {
  const clean = cleanJid(user);
  return data.marriages?.[clean]?.partner || null;
}

function isMarried(data, user) {
  return !!getPartner(data, user);
}

function formatDate(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
}

module.exports = {
  commands: ['proponer', 'aceptar', 'rechazar', 'divorcio', 'pareja', 'matrimonio'],

  async execute({ sock, msg, remoteJid, sender, command }) {
    const data = loadDB();
    sender = cleanJid(sender);

    // ==========================================
    // 💒 MENÚ PRINCIPAL
    // ==========================================
    if (command === 'matrimonio') {
      const menu = 
`┏━━━━━━━━━━━━━━━━━━━━━━━┓
┃   💒 *REGISTRO CIVIL* 💒   
┗━━━━━━━━━━━━━━━━━━━━━━━┛

¿Buscando al amor de tu vida o 
solo quieres los papeles? 📄

Comandos disponibles:
➤ *.proponer @usuario* 💍 (Arrodíllate)
➤ *.aceptar* ✅ (Di que sí)
➤ *.rechazar* ❌ (Mándal@ a la friendzone)
➤ *.pareja* 💑 (Mira tu certificado)
➤ *.divorcio* 💔 (Llama a los abogados)`;

      return sock.sendMessage(remoteJid, { text: menu }, { quoted: msg });
    }

    // ==========================================
    // 💍 PROPUESTA DE MATRIMONIO
    // ==========================================
    if (command === 'proponer') {
      const mentioned = getMentioned(msg)[0];

      if (!mentioned) {
        return sock.sendMessage(remoteJid, { text: '❌ Oye, no puedes casarte con el aire. \nDebes mencionar a alguien.\n\nEjemplo: *.proponer @usuario*' }, { quoted: msg });
      }

      const target = cleanJid(mentioned);

      if (target === sender) {
        return sock.sendMessage(remoteJid, { text: '❌ No puedes casarte contigo mismo. Ve a terapia 😹' }, { quoted: msg });
      }

      if (isMarried(data, sender)) {
        return sock.sendMessage(remoteJid, { text: '💍 ¡Ey, infiel! Ya estás casado/a. Primero usa *.divorcio*.' }, { quoted: msg });
      }

      if (isMarried(data, target)) {
        return sock.sendMessage(remoteJid, { text: '💔 Llegaste tarde, esa persona ya le pertenece a alguien más.' }, { quoted: msg });
      }

      PROPOSALS.set(target, {
        from: sender,
        to: target,
        chat: remoteJid,
        time: Date.now()
      });

      const propuestaText = 
`🔔 *¡TENEMOS UNA DECLARACIÓN!* 🔔

🤵/👰 *@${number(sender)}* se ha puesto de rodillas, ha sacado un anillo de plástico y le ha propuesto matrimonio a *@${number(target)}*.

¿Qué dices, @${number(target)}? Tienes la última palabra:
✅ Escribe *.aceptar* para vivir felices.
❌ Escribe *.rechazar* para romperle el corazón.`;

      return sock.sendMessage(remoteJid, {
        text: propuestaText,
        mentions: [sender, target]
      }, { quoted: msg });
    }

    // ==========================================
    // ✅ ACEPTAR PROPUESTA
    // ==========================================
    if (command === 'aceptar') {
      const proposal = PROPOSALS.get(sender);

      if (!proposal || proposal.chat !== remoteJid) {
        return sock.sendMessage(remoteJid, { text: '❌ Nadie te ha propuesto matrimonio últimamente. Sigue esperando.' }, { quoted: msg });
      }

      if (isMarried(data, sender) || isMarried(data, proposal.from)) {
        PROPOSALS.delete(sender);
        return sock.sendMessage(remoteJid, { text: '❌ Esta propuesta se canceló porque alguien decidió casarse con otra persona a escondidas.' }, { quoted: msg });
      }

      data.marriages[sender] = { partner: proposal.from, since: Date.now() };
      data.marriages[proposal.from] = { partner: sender, since: Date.now() };
      saveDB(data);
      PROPOSALS.delete(sender);

      // Regalo de bodas en XP si existe la base de datos
      let recompensaTexto = '';
      if (db && typeof db.addXP === 'function') {
        const regalo = 500; // XP por casarse
        await db.addXP(sender, regalo);
        await db.addXP(proposal.from, regalo);
        recompensaTexto = `\n🎁 *Regalo de bodas:* ¡Ambos han recibido ${regalo} XP!`;
      }

      const aceptadoText = 
`✨💖 *¡VIVAN LOS NOVIOS!* 💖✨

@${number(proposal.from)} y @${number(sender)} acaban de dar el sí en el altar virtual. 

Que el amor, la paciencia y el internet nunca les falte. ¡Felicidades! 🎉🥂${recompensaTexto}`;

      return sock.sendMessage(remoteJid, {
        text: aceptadoText,
        mentions: [proposal.from, sender]
      }, { quoted: msg });
    }

    // ==========================================
    // ❌ RECHAZAR PROPUESTA
    // ==========================================
    if (command === 'rechazar') {
      const proposal = PROPOSALS.get(sender);

      if (!proposal || proposal.chat !== remoteJid) {
        return sock.sendMessage(remoteJid, { text: '❌ No hay ninguna propuesta para rechazar. Estás a salvo.' }, { quoted: msg });
      }

      PROPOSALS.delete(sender);

      const rechazoText = 
`🌧️ *SOLDADO CAÍDO* 🌧️

Uff... *@${number(sender)}* acaba de rechazar fríamente la propuesta de *@${number(proposal.from)}*.

Un minuto de silencio por ese corazón roto. Directo a la friendzone 😿💔.`;

      return sock.sendMessage(remoteJid, {
        text: rechazoText,
        mentions: [sender, proposal.from]
      }, { quoted: msg });
    }

    // ==========================================
    // 💑 VER PAREJA (CERTIFICADO)
    // ==========================================
    if (command === 'pareja') {
      const partner = getPartner(data, sender);

      if (!partner) {
        return sock.sendMessage(remoteJid, { text: '💔 Estás más soltero/a que el número 1. Usa *.proponer* para buscar pareja.' }, { quoted: msg });
      }

      const since = data.marriages[sender]?.since;

      const certificado = 
`╔════════════════════════╗
      📜 *CERTIFICADO DE BODA* 📜      
╚════════════════════════╝

💍 **Cónyuge 1:** @${number(sender)}
💍 **Cónyuge 2:** @${number(partner)}

📅 **Felizmente casados desde:** _${formatDate(since)}_

💞 _"Hasta que un baneo los separe"_ 💞`;

      return sock.sendMessage(remoteJid, {
        text: certificado,
        mentions: [sender, partner]
      }, { quoted: msg });
    }

    // ==========================================
    // 💔 DIVORCIO
    // ==========================================
    if (command === 'divorcio') {
      const partner = getPartner(data, sender);

      if (!partner) {
        return sock.sendMessage(remoteJid, { text: '❌ Ni siquiera estás casado/a. ¿De quién te vas a divorciar, de tu sombra?' }, { quoted: msg });
      }

      delete data.marriages[sender];
      delete data.marriages[partner];
      saveDB(data);

      const divorcioText = 
`⚖️ *PAPELES DE DIVORCIO FIRMADOS* ⚖️

@${number(sender)} ha decidido terminar su matrimonio con @${number(partner)}.

Se acabó el amor. Ahora toca contactar a los abogados, dividir los terrenos y pelear por la custodia de las wawas 🐶🐾.

¡Vuelven a la soltería! 🍾`;

      return sock.sendMessage(remoteJid, {
        text: divorcioText,
        mentions: [sender, partner]
      }, { quoted: msg });
    }
  }
};
