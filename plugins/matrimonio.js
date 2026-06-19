'use strict';

const fs = require('fs');
const path = require('path');

// Intentamos cargar la base de datos para la XP
let db = null;
try {
  db = require('../lib/database');
} catch (e) {
  console.log('No se pudo cargar la base de datos en matrimonio.js');
}

const DB_PATH = path.join(process.cwd(), 'lib', 'marriages.json');
const PROPOSALS = new Map();
const CEREMONIES = new Map(); 
const DIVORCES = new Map(); // 🔥 Mapa para rastrear los juicios de divorcio pendientes

// Lista de Owners (extraída de tu config) para el perdón papal
const OWNERS = ['51958959882', '42696337031354', '132482980696170', '5493884466806'];

function isBotOwner(jid) {
  return OWNERS.includes(number(jid));
}

function ensureDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ marriages: {}, cooldowns: {} }, null, 2));
}

function loadDB() {
  ensureDB();
  try { 
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8') || '{}'); 
    if (!data.cooldowns) data.cooldowns = {}; // Asegurar que exista el objeto de castigos
    return data;
  } catch { 
    return { marriages: {}, cooldowns: {} }; 
  }
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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  commands: [
    'proponer', 'aceptar', 'rechazar', 'oponerse', 'pareja', 'matrimonio',
    'divorcio', 'firmar', 'romperpapeles', 'consentimiento'
  ],

  async execute({ sock, msg, remoteJid, sender, command }) {
    const data = loadDB();
    sender = cleanJid(sender);

    // ==========================================
    // ⛪ MENÚ: LA PARROQUIA / JUZGADO
    // ==========================================
    if (command === 'matrimonio') {
      const menu = 
`⛪ *PARROQUIA & JUZGADO SIRIUSBOT* ⚖️

¿Vienes por amor o por la herencia?

🕊️ *BODAS (Premio: 30,000 XP):*
➤ *.proponer @usuario* » Arrodillarse
➤ *.aceptar* » Empezar ceremonia
➤ *.rechazar* » Huir del altar
➤ *.oponerse* » Arruinar una boda
➤ *.pareja* » Ver libreta familiar

💔 *DIVORCIOS (Costo: 15,000 XP):*
➤ *.divorcio* » Enviar papeles al cónyuge
➤ *.firmar* » Aceptar el divorcio
➤ *.romperpapeles* » Negarse a firmar

👑 *SOLO OWNER:*
➤ *.consentimiento @usuario* » Quitar veto de 14 días`;

      return sock.sendMessage(remoteJid, { text: menu }, { quoted: msg });
    }

    // ==========================================
    // 👑 CONSENTIMIENTO (PERDÓN DEL OWNER)
    // ==========================================
    if (command === 'consentimiento') {
      if (!isBotOwner(sender)) return sock.sendMessage(remoteJid, { text: '❌ Solo el Owner supremo de SiriusBot puede otorgar el perdón papal.' }, { quoted: msg });
      
      const mentioned = getMentioned(msg)[0];
      if (!mentioned) return sock.sendMessage(remoteJid, { text: '⚠️ Menciona a la persona que quieres perdonar.' }, { quoted: msg });
      
      const target = cleanJid(mentioned);
      if (data.cooldowns[target]) {
        delete data.cooldowns[target];
        saveDB(data);
        return sock.sendMessage(remoteJid, { text: `✨ *PERDÓN PAPAL CONCEDIDO* ✨\n\nEl Owner ha purificado los pecados de @${number(target)}. Ya puede volver a casarse sin esperar las 2 semanas.`, mentions: [target] }, { quoted: msg });
      } else {
        return sock.sendMessage(remoteJid, { text: 'Esa persona no tiene ningún castigo activo.' }, { quoted: msg });
      }
    }

    // ==========================================
    // 💍 LA PROPUESTA
    // ==========================================
    if (command === 'proponer') {
      // ⏳ VERIFICAR CASTIGO DE 2 SEMANAS
      if (data.cooldowns[sender]) {
        const tiempoPasado = Date.now() - data.cooldowns[sender];
        const dosSemanas = 14 * 24 * 60 * 60 * 1000;
        
        if (tiempoPasado < dosSemanas) {
          const diasFaltantes = Math.ceil((dosSemanas - tiempoPasado) / (1000 * 60 * 60 * 24));
          return sock.sendMessage(remoteJid, { 
            text: `Padre SiriusBot: "¡Alto ahí, pecador! 🛑\n\nTe divorciaste hace poco. La iglesia dicta que debes guardar luto por *${diasFaltantes} días* más antes de volver a casarte.\n\n_(A menos que el Owner te dé el *.consentimiento*)_"` 
          }, { quoted: msg });
        } else {
          // Ya pasó el tiempo, quitar castigo
          delete data.cooldowns[sender];
          saveDB(data);
        }
      }

      const mentioned = getMentioned(msg)[0];
      if (!mentioned) return sock.sendMessage(remoteJid, { text: 'Padre SiriusBot: "Hijo mío, menciona a tu futuro cónyuge."' }, { quoted: msg });
      
      const target = cleanJid(mentioned);

      if (target === sender) return sock.sendMessage(remoteJid, { text: 'Padre SiriusBot: "Ve a terapia 😹"' }, { quoted: msg });
      if (isMarried(data, sender)) return sock.sendMessage(remoteJid, { text: 'Padre SiriusBot: "¡Pecador! Ya estás casado. ¡Pide el *.divorcio* primero!"' }, { quoted: msg });
      if (isMarried(data, target)) return sock.sendMessage(remoteJid, { text: 'Padre SiriusBot: "Esa oveja ya está casada con otro." ' }, { quoted: msg });

      PROPOSALS.set(target, { from: sender, to: target, chat: remoteJid, time: Date.now() });

      const propuestaText = 
`🔔 *¡SUENAN LAS CAMPANAS!* 🔔

Hermanos, *@${number(sender)}* se ha arrodillado en el altar ofreciendo una inmensa fortuna y su corazón a *@${number(target)}*.

El Padre SiriusBot pregunta:
*"Dime, @${number(target)}, ¿aceptas tomar a esta persona para amarla y respetarla?"*

👰/🤵 Di *.aceptar*
🏃💨 Di *.rechazar*`;

      return sock.sendMessage(remoteJid, { text: propuestaText, mentions: [sender, target] }, { quoted: msg });
    }

    // ==========================================
    // ✅ LA BODA (DINÁMICA CON TIEMPO)
    // ==========================================
    if (command === 'aceptar') {
      const proposal = PROPOSALS.get(sender);
      if (!proposal || proposal.chat !== remoteJid) return sock.sendMessage(remoteJid, { text: 'Padre SiriusBot: "Nadie te está esperando en el altar."' }, { quoted: msg });
      
      if (data.cooldowns[sender]) {
        const tiempoPasado = Date.now() - data.cooldowns[sender];
        if (tiempoPasado < (14 * 24 * 60 * 60 * 1000)) return sock.sendMessage(remoteJid, { text: `Padre SiriusBot: "Hijo, tú sigues vetado por tu reciente divorcio. No puedes casarte aún."` }, { quoted: msg });
      }

      if (isMarried(data, sender) || isMarried(data, proposal.from)) {
        PROPOSALS.delete(sender);
        return sock.sendMessage(remoteJid, { text: 'Padre SiriusBot: "¡Se cancela la boda! Alguien cometió adulterio en secreto."' }, { quoted: msg });
      }

      PROPOSALS.delete(sender);
      CEREMONIES.set(remoteJid, { activo: true, novia: sender, novio: proposal.from });

      await sock.sendMessage(remoteJid, { text: `✨🕊️ *LA CEREMONIA HA COMENZADO* 🕊️✨\n\n@${number(sender)} ha dicho: *¡SÍ, ACEPTO!*\n\nEl Padre SiriusBot alza las manos:\n🗣️ _"Si hay alguien que se oponga... que escriba **.oponerse** AHORA MISMO, o calle para siempre."_\n\n⏳ *Tienen 8 segundos...*`, mentions: [sender, proposal.from] });

      await sleep(8000);
      const ceremoniaActual = CEREMONIES.get(remoteJid);
      if (!ceremoniaActual || !ceremoniaActual.activo) return; 

      data.marriages[sender] = { partner: proposal.from, since: Date.now() };
      data.marriages[proposal.from] = { partner: sender, since: Date.now() };
      saveDB(data);
      CEREMONIES.delete(remoteJid);

      let recompensaTexto = '';
      if (db && typeof db.addXP === 'function') {
        const regalo = 30000; // 🔥 PREMIO MAYOR
        await db.addXP(sender, regalo);
        await db.addXP(proposal.from, regalo);
        recompensaTexto = `\n\n💰 *DOTE MATRIMONIAL:* ¡El estado les ha otorgado *${regalo} XP* a cada uno por su unión!`;
      }

      return sock.sendMessage(remoteJid, { text: `*(Silencio total en la iglesia...)* 🦗\n\n_"Por el poder que me confiere el código fuente, ¡yo los declaro unidos en sagrado matrimonio!"_\n\n🎊 ¡Lluvia de arroz para @${number(proposal.from)} y @${number(sender)}! 🎊${recompensaTexto}`, mentions: [proposal.from, sender] });
    }

    if (command === 'oponerse' || command === 'rechazar' || command === 'pareja') {
       // La lógica de estos 3 se mantiene exactamente igual que el código anterior que te pasé.
       // (Para no hacer la respuesta extremadamente larga, asume que están aquí).
       // En tu archivo real, mantén la lógica de mi respuesta anterior para estos 3.
    }

    // ==========================================
    // ⚖️ PEDIR EL DIVORCIO (INICIA JUICIO)
    // ==========================================
    if (command === 'divorcio') {
      const partner = getPartner(data, sender);
      if (!partner) return sock.sendMessage(remoteJid, { text: 'Juez SiriusBot: "No puede divorciarse si no está casado. Siguiente caso."' }, { quoted: msg });

      DIVORCES.set(partner, { from: sender, to: partner, chat: remoteJid });

      const peticionText = 
`🏛️ *JUZGADO DE FAMILIA VIRTUAL* 🏛️
_(El Padre SiriusBot se pone la toga de Juez)_

Silencio en la sala. El ciudadano @${number(sender)} ha presentado una demanda formal de divorcio contra @${number(partner)}.

💸 *ADVERTENCIA LEGAL:*
Firmar este divorcio les costará **15,000 XP** a cada uno en honorarios de abogados, y quedarán **vetados de la iglesia por 2 semanas**.

@${number(partner)}, tienes la última palabra:
✍️ Di *.firmar* para ser libre y pagar los honorarios.
🛑 Di *.romperpapeles* para negarte a darle el divorcio.`;

      return sock.sendMessage(remoteJid, { text: peticionText, mentions: [sender, partner] }, { quoted: msg });
    }

    // ==========================================
    // ✍️ FIRMAR EL DIVORCIO (ACEPTAR)
    // ==========================================
    if (command === 'firmar') {
      const divorce = DIVORCES.get(sender);
      if (!divorce || divorce.chat !== remoteJid) return sock.sendMessage(remoteJid, { text: 'Juez SiriusBot: "Usted no tiene ninguna demanda de divorcio pendiente."' }, { quoted: msg });

      // Ejecutar divorcio
      delete data.marriages[sender];
      delete data.marriages[divorce.from];
      
      // Aplicar castigo de 14 días
      data.cooldowns[sender] = Date.now();
      data.cooldowns[divorce.from] = Date.now();
      
      saveDB(data);
      DIVORCES.delete(sender);

      let multaTexto = '';
      if (db && typeof db.addXP === 'function') {
        const costo = -15000; // 🔥 MULTA
        await db.addXP(sender, costo);
        await db.addXP(divorce.from, costo);
        multaTexto = `\n\n💸 *HONORARIOS LEGALES:* Se han descontado **15,000 XP** a cada uno de sus cuentas bancarias. (Si quedaron en negativo, están en bancarrota).`;
      }

      const divorcioEjecutado = 
`🔨 *¡CASO CERRADO!* 🔨
*(El Juez golpea el mazo)*

@${number(sender)} ha firmado los papeles con lágrimas en los ojos. El sagrado vínculo con @${number(divorce.from)} queda OFICIALMENTE ROTO.

La custodia de las wawas 🐶🐾 queda a cargo del estado.

⛔ *PENALIDAD APLICADA:* Ninguno podrá volver a casarse durante 14 días.${multaTexto}

El amor ha muerto. ¡Retírense de mi corte!`;

      return sock.sendMessage(remoteJid, { text: divorcioEjecutado, mentions: [sender, divorce.from] }, { quoted: msg });
    }

    // ==========================================
    // 🛑 ROMPER PAPELES (RECHAZAR DIVORCIO)
    // ==========================================
    if (command === 'romperpapeles') {
      const divorce = DIVORCES.get(sender);
      if (!divorce || divorce.chat !== remoteJid) return sock.sendMessage(remoteJid, { text: 'No hay papeles que romper.' }, { quoted: msg });

      DIVORCES.delete(sender);

      const negacionText = 
`🛑 *¡DRAMA EN EL JUZGADO!* 🛑

@${number(sender)} ha tomado la demanda de divorcio, la ha roto en mil pedazos en la cara del juez y le ha gritado a @${number(divorce.from)}:
*"¡DE AQUÍ SOLO SALIMOS MUERTOS! ¡NO TE DARÉ EL DIVORCIO!"* 😱

El Juez SiriusBot suspira y archiva el caso.
Siguen infelizmente casados. 💍🔒`;

      return sock.sendMessage(remoteJid, { text: negacionText, mentions: [sender, divorce.from] }, { quoted: msg });
    }
  }
};
