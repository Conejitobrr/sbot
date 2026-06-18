'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../lib/database');

// 📂 RUTA DE TUS VIDEOS (media/mascotas)
const PETS_DIR = path.resolve(__dirname, '../media/mascotas');

// 🐾 MASCOTA PARA PRUEBAS: LOBO 🐺
const TIPOS_MASCOTA = ['lobo'];

// Nivel necesario para que la mascota evolucione a adulta
const NIVEL_EVOLUCION = 10; 

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function cleanNumber(jid = '') {
  return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

function getTarget(msg, args) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);

  return null;
}

// 🔥 Función para obtener el VIDEO correcto
function getPetVideo(type, state, level) {
  const stage = level >= NIVEL_EVOLUCION ? 'adulto' : 'bebe';
  
  // Ej: media/mascotas/lobo_bebe_jugando.mp4
  const fileName = `${type}_${stage}_${state}.mp4`;
  const filePath = path.join(PETS_DIR, fileName);

  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }
  return null; // Si no existe, no crashea, solo manda texto
}

// ⏱️ Helper para ver si pasaron X horas
function hoursPassed(timestamp, hours) {
  return (Date.now() - (timestamp || 0)) > (hours * 60 * 60 * 1000);
}

module.exports = {
  commands: [
    'adoptar', 'mascota', 'alimentar', 'jugar', 
    'entrenar', 'pasear', 'dormir', 'curar', 'sacrificar'
  ],
  
  async execute(ctx) {
    const { sock, remoteJid, msg, sender, args, command, isOwner, pushName } = ctx;

    // 🛑 BLOQUEO TEMPORAL: SOLO OWNERS
    if (!isOwner) {
      return sock.sendMessage(remoteJid, { 
        text: `🚧 *Módulo en Mantenimiento*\n\nEl sistema de mascotas está en fase de pruebas beta. Por ahora, solo los Owners pueden utilizarlo.` 
      }, { quoted: msg });
    }

    const userKey = cleanJid(sender);
    const userData = await db.getUser(userKey);
    const now = Date.now();

    // ==========================================
    // 1. ADOPTAR
    // ==========================================
    if (command === 'adoptar') {
      if (userData.pet) {
        return sock.sendMessage(remoteJid, { text: `❌ Ya tienes una mascota llamada *${userData.pet.name}*.` }, { quoted: msg });
      }

      const petName = args.join(' ') || 'Sin Nombre';
      const randomType = TIPOS_MASCOTA[Math.floor(Math.random() * TIPOS_MASCOTA.length)];

      userData.pet = {
        name: petName,
        type: randomType,
        xp: 0,
        level: 1,
        lastFeed: now,
        lastPlay: now,
        lastTrain: 0,
        lastWalk: 0
      };

      await db.setUser(userKey, userData);

      const video = getPetVideo(randomType, 'naciendo', 1);
      const text = `🎉 ¡Milagro de vida!\n\nAcaba de nacer tu *${randomType.toUpperCase()}* bebé.\nLe has puesto de nombre: *${petName}*\n\nUsa *.mascota* para ver cómo está.`;

      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }

    // ==========================================
    // 2. VER MASCOTA (Estados dinámicos)
    // ==========================================
    if (command === 'mascota') {
      if (!userData.pet) return sock.sendMessage(remoteJid, { text: `❌ No tienes ninguna mascota. Usa *.adoptar [nombre]*` }, { quoted: msg });

      const p = userData.pet;
      const stage = p.level >= NIVEL_EVOLUCION ? 'Adulto 🐺' : 'Bebé 🐾';
      const horaActual = new Date().getHours();

      // ESTADO DINÁMICO
      let estadoActual = 'contenta';
      let notaEstado = '¡Está muy feliz y lleno de energía!';

      if (hoursPassed(p.lastFeed, 24)) {
        estadoActual = 'enferma';
        notaEstado = '🤒 Está enfermo por no comer. Usa *.curar* y luego *.alimentar*.';
      } else if (hoursPassed(p.lastPlay, 24)) {
        estadoActual = 'triste';
        notaEstado = '😢 Está muy triste porque lo ignoras. Usa *.jugar*.';
      } else if (horaActual < 6 || horaActual >= 22) {
        estadoActual = 'durmiendo';
        notaEstado = '💤 Está durmiendo profundamente. Shhh...';
      }

      const video = getPetVideo(p.type, estadoActual, p.level);
      const text = `🐾 *PERFIL DE MASCOTA* 🐾\n\n👤 Dueño: ${pushName}\n🏷️ Nombre: *${p.name}*\n🧬 Tipo: *${p.type.toUpperCase()}*\n📊 Nivel: *${p.level}* (${stage})\n✨ Experiencia: *${p.xp} XP*\n\n💭 Estado: ${notaEstado}`;

      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }

    // ==========================================
    // SISTEMA GENERAL DE ACCIONES (Alimentar, Jugar, etc)
    // ==========================================
    if (!userData.pet && ['alimentar', 'jugar', 'entrenar', 'pasear', 'dormir', 'curar'].includes(command)) {
      return sock.sendMessage(remoteJid, { text: `❌ No tienes mascota.` }, { quoted: msg });
    }

    const p = userData.pet;

    // Función interna para manejar la subida de XP y evolución
    const procesarAccion = async (gainXP, newState, actionText, isHeal = false) => {
      if (!isHeal && hoursPassed(p.lastFeed, 24)) {
        const videoEnferma = getPetVideo(p.type, 'enferma', p.level);
        const txt = `🤒 *${p.name}* está demasiado débil y enfermo para hacer eso. Usa *.curar* primero.`;
        if (videoEnferma) return sock.sendMessage(remoteJid, { video: videoEnferma, caption: txt, gifPlayback: true }, { quoted: msg });
        return sock.sendMessage(remoteJid, { text: txt }, { quoted: msg });
      }

      p.xp += gainXP;
      const newLevel = Math.floor(p.xp / 200) + 1;
      let evoluciono = false;

      if (newLevel > p.level) {
        if (p.level < NIVEL_EVOLUCION && newLevel >= NIVEL_EVOLUCION) evoluciono = true;
        p.level = newLevel;
      }

      await db.setUser(userKey, userData);

      const estadoFinal = evoluciono ? 'evolucionando' : newState;
      let text = `${actionText}\n⭐ Ganó *+${gainXP} XP*.`;

      if (evoluciono) {
        text += `\n\n✨ ¡WOW! *${p.name}* ha envuelto su cuerpo en un destello de luz y ha crecido.\n¡Ahora es un *Lobo Adulto*!`;
      }

      const video = getPetVideo(p.type, estadoFinal, p.level);
      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    };

    // ==========================================
    // 3. ALIMENTAR (Cooldown 2h)
    // ==========================================
    if (command === 'alimentar') {
      const remaining = (2 * 60 * 60 * 1000) - (now - (p.lastFeed || 0));
      if (remaining > 0 && !hoursPassed(p.lastFeed, 24)) {
        const m = Math.floor(remaining / 60000);
        return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* no tiene hambre. Espera *${m} min*.` }, { quoted: msg });
      }
      p.lastFeed = now;
      return procesarAccion(Math.floor(Math.random() * 50) + 20, 'comiendo', `🍖 Le diste su comida favorita a *${p.name}*.`);
    }

    // ==========================================
    // 4. JUGAR (Cooldown 30m)
    // ==========================================
    if (command === 'jugar') {
      const remaining = (30 * 60 * 1000) - (now - (p.lastPlay || 0));
      if (remaining > 0) {
        const m = Math.floor(remaining / 60000);
        return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* está cansado. Espera *${m} min*.` }, { quoted: msg });
      }
      p.lastPlay = now;
      return procesarAccion(Math.floor(Math.random() * 20) + 10, 'jugando', `🎾 Lanzaste un disco y jugaste con *${p.name}*.`);
    }

    // ==========================================
    // 5. ENTRENAR (Cooldown 4h)
    // ==========================================
    if (command === 'entrenar') {
      const remaining = (4 * 60 * 60 * 1000) - (now - (p.lastTrain || 0));
      if (remaining > 0) {
        const m = Math.floor(remaining / 60000);
        return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* está exhausto. Espera *${m} min*.` }, { quoted: msg });
      }
      p.lastTrain = now;
      return procesarAccion(Math.floor(Math.random() * 50) + 50, 'entrenando', `⚔️ Entrenaste las habilidades de caza de *${p.name}*.`);
    }

    // ==========================================
    // 6. PASEAR (Cooldown 1h)
    // ==========================================
    if (command === 'pasear') {
      const remaining = (60 * 60 * 1000) - (now - (p.lastWalk || 0));
      if (remaining > 0) {
        const m = Math.floor(remaining / 60000);
        return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* ya caminó suficiente. Espera *${m} min*.` }, { quoted: msg });
      }
      p.lastWalk = now;
      return procesarAccion(Math.floor(Math.random() * 30) + 15, 'paseando', `🌳 Fuiste a pasear con *${p.name}* bajo la luna.`);
    }

    // ==========================================
    // 7. CURAR
    // ==========================================
    if (command === 'curar') {
      if (!hoursPassed(p.lastFeed, 24)) {
        return sock.sendMessage(remoteJid, { text: `✅ *${p.name}* goza de buena salud. No necesita medicina.` }, { quoted: msg });
      }
      p.lastFeed = now - (23 * 60 * 60 * 1000); 
      return procesarAccion(5, 'curando', `💊 Le diste medicina a *${p.name}*. ¡Se recuperó satisfactoriamente!`, true);
    }

    // ==========================================
    // 8. DORMIR
    // ==========================================
    if (command === 'dormir') {
      const video = getPetVideo(p.type, 'durmiendo', p.level);
      const text = `💤 Mandaste a dormir a *${p.name}*. Aúlla bajito mientras sueña...`;
      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }

    // ==========================================
    // 9. SACRIFICAR (SOLO OWNER)
    // ==========================================
    if (command === 'sacrificar') {
      const target = getTarget(msg, args);
      if (!target) return sock.sendMessage(remoteJid, { text: `❌ Debes mencionar al dueño de la mascota.` }, { quoted: msg });

      const targetData = await db.getUser(target);
      if (!targetData.pet) return sock.sendMessage(remoteJid, { text: `❌ Ese usuario no tiene ninguna mascota.` }, { quoted: msg });

      const nombreMascota = targetData.pet.name;
      const level = targetData.pet.level;
      const type = targetData.pet.type;
      
      delete targetData.pet; 
      await db.setUser(target, targetData);

      const video = getPetVideo(type, 'sacrificada', level);
      const text = `☠️ El lobo *${nombreMascota}* de @${cleanNumber(target)} fue sacrificado y regresó con la manada celestial...`;

      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true, mentions: [`${cleanNumber(target)}@s.whatsapp.net`] }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text, mentions: [`${cleanNumber(target)}@s.whatsapp.net`] }, { quoted: msg });
    }
  }
};
