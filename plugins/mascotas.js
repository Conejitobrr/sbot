'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../lib/database');

// 📂 RUTA DE TUS VIDEOS
const PETS_DIR = path.resolve(__dirname, '../media/mascotas');

// 🐾 POR AHORA SOLO HAY 1 TIPO PARA PRUEBAS (Puedes añadir más luego)
const TIPOS_MASCOTA = ['Lobo'];

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
  
  // Ej: media/mascotas/dragon_bebe_comiendo.mp4
  const fileName = `${type}_${stage}_${state}.mp4`;
  const filePath = path.join(PETS_DIR, fileName);

  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }
  return null; // Si no tienes el video, el bot no crashea, solo manda texto
}

module.exports = {
  commands: ['adoptar', 'mascota', 'alimentar', 'sacrificar'],
  
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
    // 1. COMANDO: .adoptar [nombre]
    // ==========================================
    if (command === 'adoptar') {
      if (userData.pet) {
        return sock.sendMessage(remoteJid, { 
          text: `❌ Ya tienes una mascota llamada *${userData.pet.name}*. No puedes tener dos.` 
        }, { quoted: msg });
      }

      const petName = args.join(' ') || 'Sin Nombre';
      const randomType = TIPOS_MASCOTA[Math.floor(Math.random() * TIPOS_MASCOTA.length)];

      userData.pet = {
        name: petName,
        type: randomType,
        xp: 0,
        level: 1,
        lastFeed: 0
      };

      await db.setUser(userKey, userData);

      // Usamos el estado "naciendo"
      const video = getPetVideo(randomType, 'naciendo', 1);
      const text = `🎉 ¡Milagro de vida!\n\nAcaba de nacer tu *${randomType.toUpperCase()}* bebé.\nLe has puesto de nombre: *${petName}*\n\nUsa *.mascota* para ver cómo está y *.alimentar* para que crezca.`;

      if (video) {
        // gifPlayback: true lo envía como un video en bucle y sin sonido (estilo GIF)
        return sock.sendMessage(remoteJid, { video: video, caption: text, gifPlayback: true }, { quoted: msg });
      }
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }

    // ==========================================
    // 2. COMANDO: .mascota
    // ==========================================
    if (command === 'mascota') {
      if (!userData.pet) {
        return sock.sendMessage(remoteJid, { 
          text: `❌ No tienes ninguna mascota. Usa *.adoptar [nombre]* para conseguir una.` 
        }, { quoted: msg });
      }

      const p = userData.pet;
      const stage = p.level >= NIVEL_EVOLUCION ? 'Adulto 🐉' : 'Bebé 🐣';
      
      // Usamos el estado "contenta"
      const video = getPetVideo(p.type, 'contenta', p.level);
      const text = `🐾 *PERFIL DE MASCOTA* 🐾\n\n👤 Dueño: ${pushName}\n🏷️ Nombre: *${p.name}*\n🧬 Tipo: *${p.type.toUpperCase()}*\n📊 Nivel: *${p.level}* (${stage})\n✨ Experiencia: *${p.xp} XP*`;

      if (video) {
        return sock.sendMessage(remoteJid, { video: video, caption: text, gifPlayback: true }, { quoted: msg });
      }
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }

    // ==========================================
    // 3. COMANDO: .alimentar
    // ==========================================
    if (command === 'alimentar') {
      if (!userData.pet) {
        return sock.sendMessage(remoteJid, { text: `❌ No tienes mascota para alimentar.` }, { quoted: msg });
      }

      const p = userData.pet;
      const cooldown = 2 * 60 * 60 * 1000; // 2 horas entre comidas

      const remaining = cooldown - (now - (p.lastFeed || 0));
      if (remaining > 0) {
        const m = Math.floor(remaining / 60000);
        return sock.sendMessage(remoteJid, { 
          text: `⏳ *${p.name}* está lleno. Tienes que esperar *${m} minuto(s)* para volver a darle de comer.` 
        }, { quoted: msg });
      }

      const gainXP = Math.floor(Math.random() * 50) + 20; 
      p.xp += gainXP;
      p.lastFeed = now;

      const newLevel = Math.floor(p.xp / 200) + 1;
      let evoluciono = false;

      if (newLevel > p.level) {
        if (p.level < NIVEL_EVOLUCION && newLevel >= NIVEL_EVOLUCION) {
          evoluciono = true; 
        }
        p.level = newLevel;
      }

      await db.setUser(userKey, userData);

      // Usamos el estado "comiendo"
      const video = getPetVideo(p.type, 'comiendo', p.level);
      let text = `🍖 Le diste su comida favorita a *${p.name}*.\n⭐ Ganó *+${gainXP} XP*.`;

      if (evoluciono) {
        text += `\n\n✨ ¡WOW! *${p.name}* ha crecido y ahora es un *Adulto*. Su apariencia ha cambiado por completo. Usa *.mascota* para verlo.`;
      }

      if (video) {
        return sock.sendMessage(remoteJid, { video: video, caption: text, gifPlayback: true }, { quoted: msg });
      }
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }

    // ==========================================
    // 4. COMANDO: .sacrificar @usuario (SOLO OWNER)
    // ==========================================
    if (command === 'sacrificar') {
      const target = getTarget(msg, args);
      if (!target) {
        return sock.sendMessage(remoteJid, { text: `❌ Debes mencionar al dueño de la mascota.` }, { quoted: msg });
      }

      const targetData = await db.getUser(target);
      if (!targetData.pet) {
        return sock.sendMessage(remoteJid, { text: `❌ Ese usuario no tiene ninguna mascota.` }, { quoted: msg });
      }

      const nombreMascota = targetData.pet.name;
      delete targetData.pet; 
      
      await db.setUser(target, targetData);

      return sock.sendMessage(remoteJid, { 
        text: `☠️ La mascota *${nombreMascota}* de @${cleanNumber(target)} ha sido enviada al más allá por orden tuya.\n\nEl usuario tiene su espacio libre para adoptar otra.`,
        mentions: [`${cleanNumber(target)}@s.whatsapp.net`]
      }, { quoted: msg });
    }
  }
};
