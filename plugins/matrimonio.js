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
    fs.writeFileSync(DB_PATH, JSON.stringify({ marriages: {} }, null, 2));
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

// Genera un ID falso para darle realismo a los documentos
function generateID() {
  return Math.floor(100000 + Math.random() * 900000);
}

module.exports = {
  commands: ['proponer', 'aceptar', 'rechazar', 'divorcio', 'pareja', 'matrimonio'],

  async execute({ sock, msg, remoteJid, sender, command }) {
    const data = loadDB();
    sender = cleanJid(sender);

    // ==========================================
    // 🏛️ MENÚ PRINCIPAL DEL REGISTRO CIVIL
    // ==========================================
    if (command === 'matrimonio') {
      const menu = 
`🏛️ *PORTAL DEL REGISTRO CIVIL VIRTUAL* 🏛️
TRAMITACIÓN DE UNIONES Y SEPARACIONES

Bienvenido al sistema automatizado. 
Seleccione el trámite que desea realizar:

📄 *TRAMITES DISPONIBLES:*
➤ *.proponer @usuario* » Solicitud de Unión Civil
➤ *.aceptar* » Firma de Acta Matrimonial
➤ *.rechazar* » Denegación de Solicitud
➤ *.pareja* » Emitir Certificado Vigente
➤ *.divorcio* » Juicio de Separación Legal

_Atención las 24 hrs. No se aceptan sobornos._`;

      return sock.sendMessage(remoteJid, { text: menu }, { quoted: msg });
    }

    // ==========================================
    // 💍 PETICIÓN FORMAL (PROPONER)
    // ==========================================
    if (command === 'proponer') {
      const mentioned = getMentioned(msg)[0];

      if (!mentioned) return sock.sendMessage(remoteJid, { text: '⚠️ [ERROR DE SISTEMA]\nFalta el destinatario. Use: *.proponer @usuario*' }, { quoted: msg });
      
      const target = cleanJid(mentioned);

      if (target === sender) return sock.sendMessage(remoteJid, { text: '⚠️ [ERROR PSICOLÓGICO]\nNo es posible emitir un acta para casarse consigo mismo.' }, { quoted: msg });
      if (isMarried(data, sender)) return sock.sendMessage(remoteJid, { text: '⚠️ [FRAUDE DETECTADO]\nEl sistema indica que usted ya está casado. Tramite su *.divorcio* primero.' }, { quoted: msg });
      if (isMarried(data, target)) return sock.sendMessage(remoteJid, { text: '⚠️ [SOLICITUD DENEGADA]\nEl ciudadano solicitado ya se encuentra legalmente unido a otra persona.' }, { quoted: msg });

      PROPOSALS.set(target, { from: sender, to: target, chat: remoteJid, time: Date.now() });

      const propuestaText = 
`📄 *EXPEDIENTE DE SOLICITUD N° ${generateID()}*
TIPO: Petición de Unión Civil

👤 *SOLICITANTE:* @${number(sender)}
👤 *DESTINATARIO:* @${number(target)}

*NOTIFICACIÓN OFICIAL:*
Se le notifica al destinatario que se ha puesto un anillo a su disposición. Para proceder con el registro legal, por favor emita su respuesta:

✅ Emitir firma: *.aceptar*
❌ Denegar firma: *.rechazar*

_Este documento expira si no es respondido._`;

      return sock.sendMessage(remoteJid, { text: propuestaText, mentions: [sender, target] }, { quoted: msg });
    }

    // ==========================================
    // ✅ RESOLUCIÓN DE APROBACIÓN (ACEPTAR)
    // ==========================================
    if (command === 'aceptar') {
      const proposal = PROPOSALS.get(sender);

      if (!proposal || proposal.chat !== remoteJid) return sock.sendMessage(remoteJid, { text: '⚠️ No se encontraron solicitudes pendientes a su nombre en la base de datos.' }, { quoted: msg });
      if (isMarried(data, sender) || isMarried(data, proposal.from)) {
        PROPOSALS.delete(sender);
        return sock.sendMessage(remoteJid, { text: '⚠️ El trámite fue anulado por conflicto de estado civil (alguien ya se casó).' }, { quoted: msg });
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
        recompensaTexto = `\n💰 *SUBVENCIÓN DEL ESTADO:* ${regalo} XP a cada uno.`;
      }

      const aceptadoText = 
`✅ *RESOLUCIÓN MATRIMONIAL APROBADA*
──────────────────────
Por el poder conferido por este servidor, los ciudadanos han firmado oficialmente el acta.

🤵/👰 **CÓNYUGE 1:** @${number(proposal.from)}
🤵/👰 **CÓNYUGE 2:** @${number(sender)}

*ESTADO LEGAL:* CASADOS 💍
_A partir de este momento, comparten bienes, stickers y traumas._${recompensaTexto}

SELLO DEL REGISTRO:
💮 [ A P R O B A D O ]`;

      return sock.sendMessage(remoteJid, { text: aceptadoText, mentions: [proposal.from, sender] }, { quoted: msg });
    }

    // ==========================================
    // ❌ RESOLUCIÓN DE RECHAZO (RECHAZAR)
    // ==========================================
    if (command === 'rechazar') {
      const proposal = PROPOSALS.get(sender);

      if (!proposal || proposal.chat !== remoteJid) return sock.sendMessage(remoteJid, { text: '⚠️ No hay ninguna solicitud pendiente a su nombre.' }, { quoted: msg });

      PROPOSALS.delete(sender);

      const rechazoText = 
`❌ *RESOLUCIÓN DE RECHAZO*
EXPEDIENTE N° ${generateID()} ARCHIVADO

El ciudadano @${number(sender)} ha declinado formalmente la solicitud de unión civil impuesta por @${number(proposal.from)}.

*MOTIVO DE RECHAZO:* Enviado a la Friendzone.
*DAÑOS:* Perjuicio psicológico severo.

_Se recomienda al solicitante no rogar y mantener su dignidad intacta._`;

      return sock.sendMessage(remoteJid, { text: rechazoText, mentions: [sender, proposal.from] }, { quoted: msg });
    }

    // ==========================================
    // 💑 EMISIÓN DE CERTIFICADO (PAREJA)
    // ==========================================
    if (command === 'pareja') {
      const partner = getPartner(data, sender);

      if (!partner) return sock.sendMessage(remoteJid, { text: '⚠️ *BÚSQUEDA SIN RESULTADOS:* Usted figura como SOLTERO/A en nuestra base de datos.' }, { quoted: msg });

      const since = data.marriages[sender]?.since;

      const certificado = 
`╔═════════════════════════════════╗
║   🏛️ REGISTRO NACIONAL VIRTUAL  ║
╠═════════════════════════════════╣
║    📜 CERTIFICADO DE UNIÓN 📜   ║
╚═════════════════════════════════╝

*FOLIO:* ${generateID()}-A
*FECHA DE INSCRIPCIÓN:* ${formatDate(since)}

Se certifica la unión legal y oficial de:
🔸 @${number(sender)}
🔸 @${number(partner)}

*NOTAS:*
Este documento es válido en todos los grupos de la jurisdicción del Bot.
_Hasta que un baneo o el .divorcio los separe._

█║▌│█│║▌║││█║▌║▌
   VERIFICADO ✓`;

      return sock.sendMessage(remoteJid, { text: certificado, mentions: [sender, partner] }, { quoted: msg });
    }

    // ==========================================
    // ⚖️ ACTA DE DIVORCIO FORMAL (DIVORCIO)
    // ==========================================
    if (command === 'divorcio') {
      const partner = getPartner(data, sender);

      if (!partner) return sock.sendMessage(remoteJid, { text: '⚠️ *ERROR JURÍDICO:* No puede divorciarse si no existe un matrimonio previo registrado.' }, { quoted: msg });

      delete data.marriages[sender];
      delete data.marriages[partner];
      saveDB(data);

      const divorcioText = 
`🏛️ *JUZGADO DE FAMILIA VIRTUAL* 🏛️
📄 ACTA DE DIVORCIO Y SEPARACIÓN DE BIENES

*NÚMERO DE EXPEDIENTE:* #${generateID()}-ROTO

Por la presente, se declara la disolución irrevocable del vínculo matrimonial entre:
👤 *Demandante:* @${number(sender)}
👤 *Demandado/a:* @${number(partner)}

*RESOLUCIÓN JUDICIAL:*
1. Se aprueba la separación definitiva.
2. Queda pendiente la división de los terrenos virtuales y la economía (XP).
3. Se inicia el juicio por la custodia compartida de las wawas 🐶🐾 y los gastos de su comida.

⛔ *NUEVO ESTADO CIVIL:* SOLTEROS
✍️ _Firma del Juez: SiriusBot_`;

      return sock.sendMessage(remoteJid, { text: divorcioText, mentions: [sender, partner] }, { quoted: msg });
    }
  }
};
