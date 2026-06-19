'use strict';

const fs = require('fs');
const path = require('path');

// Intentamos cargar la base de datos para los regalos de boda
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
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ marriages: {} }, null, 2));
}

function loadDB() {
  ensureDB();
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8') || '{}'); } 
  catch { return { marriages: {} }; }
}

function saveDB(data) {
  ensureDB();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function number(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }
function getMentioned(msg) { return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []; }
function getPartner(data, user) { const clean = cleanJid(user); return data.marriages?.[clean]?.partner || null; }
function isMarried(data, user) { return !!getPartner(data, user); }
function formatDate(ms) { return new Date(ms).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }); }

module.exports = {
  commands: ['proponer', 'aceptar', 'rechazar', 'divorcio', 'pareja', 'matrimonio'],

  async execute({ sock, msg, remoteJid, sender, command }) {
    const data = loadDB();
    sender = cleanJid(sender);

    // ==========================================
    // ⛪ MENÚ: LA PARROQUIA DEL BOT
    // ==========================================
    if (command === 'matrimonio') {
      const menu = 
`⛪ *PARROQUIA DE SAN SIRIUS* ⛪
"Donde dos almas se unen por WiFi"

Hermanos, bienvenidos a la sagrada capilla del grupo. ¿Qué sacramento desean recibir hoy?

🕊️ *OPCIONES:*
➤ *.proponer @usuario* » Arrodillarse en el altar
➤ *.aceptar* » Dar el "Sí, acepto"
➤ *.rechazar* » Huir de la iglesia
➤ *.pareja* » Ver el acta bendecida
➤ *.divorcio* » Llamar al Juez Sirius`;

      return sock.sendMessage(remoteJid, { text: menu }, { quoted: msg });
    }

    // ==========================================
    // 💍 LA PROPUESTA (EL PADRE HABLA)
    // ==========================================
    if (command === 'proponer') {
      const mentioned = getMentioned(msg)[0];
      if (!mentioned) return sock.sendMessage(remoteJid, { text: 'Padre Sirius: "Hijo mío, debes mencionar a la persona que amas. No puedo casarte con el viento.\nUsa: *.proponer @usuario*"' }, { quoted: msg });
      
      const target = cleanJid(mentioned);

      if (target === sender) return sock.sendMessage(remoteJid, { text: 'Padre Sirius: "El amor propio es importante, pero no te puedo casar contigo mismo. Ve a confesarte 😹"' }, { quoted: msg });
      if (isMarried(data, sender)) return sock.sendMessage(remoteJid, { text: 'Padre Sirius: "¡Pecador! Ya tienes una pareja en sagrado matrimonio. ¡Usa *.divorcio* primero!"' }, { quoted: msg });
      if (isMarried(data, target)) return sock.sendMessage(remoteJid, { text: 'Padre Sirius: "Llegas tarde, hijo. Esa oveja ya pertenece a otro rebaño (ya está casada)."' }, { quoted: msg });

      PROPOSALS.set(target, { from: sender, to: target, chat: remoteJid, time: Date.now() });

      const propuestaText = 
`🔔 *¡SUENAN LAS CAMPANAS!* 🔔

Hermanos y hermanas, estamos aquí reunidos porque *@${number(sender)}* se ha puesto su mejor traje, se ha arrodillado en el altar y le está ofreciendo su corazón a *@${number(target)}*.

El Padre Sirius se acomoda los lentes y pregunta:
*"Dime, @${number(target)}, ¿aceptas tomar a esta persona para amarla y respetarla, incluso cuando no haya internet?"*

Responde para continuar la ceremonia:
👰/🤵 Di *.aceptar*
🏃💨 Di *.rechazar*`;

      return sock.sendMessage(remoteJid, { text: propuestaText, mentions: [sender, target] }, { quoted: msg });
    }

    // ==========================================
    // ✅ LA BODA (ACEPTAR)
    // ==========================================
    if (command === 'aceptar') {
      const proposal = PROPOSALS.get(sender);

      if (!proposal || proposal.chat !== remoteJid) return sock.sendMessage(remoteJid, { text: 'Padre Sirius: "Hijo, nadie te está esperando en el altar. Vuelve a sentarte."' }, { quoted: msg });
      if (isMarried(data, sender) || isMarried(data, proposal.from)) {
        PROPOSALS.delete(sender);
        return sock.sendMessage(remoteJid, { text: 'Padre Sirius: "¡Se cancela la boda! Alguien ha cometido adulterio y se casó con otra persona."' }, { quoted: msg });
      }

      data.marriages[sender] = { partner: proposal.from, since: Date.now() };
      data.marriages[proposal.from] = { partner: sender, since: Date.now() };
      saveDB(data);
      PROPOSALS.delete(sender);

      let recompensaTexto = '';
      if (db && typeof db.addXP === 'function') {
        const regalo = 500;
        await db.addXP(sender, regalo);
        await db.addXP(proposal.from, regalo);
        recompensaTexto = `\n\n✉️ *Lluvia de sobres:* Los padrinos les han regalado *${regalo} XP* a cada uno.`;
      }

      const aceptadoText = 
`✨🕊️ *LA CEREMONIA HA CONCLUIDO* 🕊️✨

El Padre Sirius alza las manos hacia el cielo:
_"Si hay alguien en este grupo que se oponga a este matrimonio, que hable ahora o sea baneado para siempre..."_

*(Silencio en la sala)*

_"Entonces, por el poder que me confiere el código fuente, ¡yo los declaro unidos en sagrado matrimonio!"_

🎊 ¡Lluvia de arroz para @${number(proposal.from)} y @${number(sender)}! 🎊
Ya pueden besarse (o mandarse un sticker romántico).${recompensaTexto}`;

      return sock.sendMessage(remoteJid, { text: aceptadoText, mentions: [proposal.from, sender] }, { quoted: msg });
    }

    // ==========================================
    // ❌ EL RECHAZO (NOVIA/O A LA FUGA)
    // ==========================================
    if (command === 'rechazar') {
      const proposal = PROPOSALS.get(sender);
      if (!proposal || proposal.chat !== remoteJid) return sock.sendMessage(remoteJid, { text: 'No hay nadie en el altar esperando tu rechazo.' }, { quoted: msg });
      
      PROPOSALS.delete(sender);

      const rechazoText = 
`🏃💨 *¡DRAMA EN EL ALTAR!* 🏃💨

El Padre Sirius se persigna: _"¡Dios Santo!"_

@${number(sender)} ha gritado "¡NO!" y ha salido corriendo por la puerta principal de la iglesia, dejando a @${number(proposal.from)} llorando con el anillo en la mano.

Alguien traiga tequila, tenemos a un soldado en la friendzone 😿💔.`;

      return sock.sendMessage(remoteJid, { text: rechazoText, mentions: [sender, proposal.from] }, { quoted: msg });
    }

    // ==========================================
    // 💑 EL CERTIFICADO (PAREJA)
    // ==========================================
    if (command === 'pareja') {
      const partner = getPartner(data, sender);
      if (!partner) return sock.sendMessage(remoteJid, { text: 'Padre Sirius: "Aún eres un alma libre y soltera. Ve y usa *.proponer* para encontrar la luz."' }, { quoted: msg });

      const since = data.marriages[sender]?.since;

      const certificado = 
`╔════════════════════════════╗
      📜 *LIBRETA DE FAMILIA BENDITA* 📜      
╚════════════════════════════╝

Con la bendición del Padre Sirius, se certifica el amor de:
💞 @${number(sender)}
💞 @${number(partner)}

📅 *Unidos por la gracia divina desde:*
_${formatDate(since)}_

_"Lo que el bot ha unido, que no lo separe un admin"_ 🕊️`;

      return sock.sendMessage(remoteJid, { text: certificado, mentions: [sender, partner] }, { quoted: msg });
    }

    // ==========================================
    // ⚖️ EL DIVORCIO (EL JUEZ SIRIUS)
    // ==========================================
    if (command === 'divorcio') {
      const partner = getPartner(data, sender);
      if (!partner) return sock.sendMessage(remoteJid, { text: 'Juez Sirius: "Señor/a, no puedo divorciarlo si no está casado. Deje de hacer perder el tiempo a la corte."' }, { quoted: msg });

      delete data.marriages[sender];
      delete data.marriages[partner];
      saveDB(data);

      const divorcioText = 
`⚖️ *TRIBUNAL DE FAMILIA VIRTUAL* ⚖️
_(El Padre Sirius se quita la sotana y se pone la toga de Juez)_

Silencio en la sala. Por solicitud de @${number(sender)}, se declara oficialmente ROTO el sagrado vínculo matrimonial con @${number(partner)}.

*RESOLUCIÓN DEL JUEZ:*
🔨 Se aprueba el divorcio por incompatibilidad de caracteres.
🔨 Se inicia el juicio para la división de la experiencia (XP) acumulada.
🔨 La custodia de las wawas 🐶🐾 queda bajo evaluación del tribunal.

El amor ha muerto. ¡Vuelven al mercado de solteros! 🍾💔`;

      return sock.sendMessage(remoteJid, { text: divorcioText, mentions: [sender, partner] }, { quoted: msg });
    }
  }
};
