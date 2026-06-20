'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../lib/database');

// 📂 RUTA DE TUS VIDEOS (media/mascotas)
const PETS_DIR = path.resolve(__dirname, '../media/mascotas');

const NIVEL_EVOLUCION = 10; 

// 🐾 BASE DE DATOS DE 250+ ANIMALES CLASIFICADOS POR RAREZA
const ANIMALES = {
  comun: ["Perro", "Gato", "Conejo", "Hámster", "Tortuga", "Loro", "Pato", "Gallina", "Cerdo", "Oveja", "Vaca", "Caballo", "Ratón", "Paloma", "Pavo", "Iguana", "Rana", "Sapo", "Pez Dorado", "Canario", "Cabra", "Burro", "Ganso", "Codorniz", "Cobaya", "Hurón", "Erizo", "Cisne", "Gaviota", "Cuervo", "Gorrión", "Golondrina", "Búho", "Lechuza", "Carpintero", "Pelícano", "Flamenco", "Cigüeña", "Perezoso", "Armadillo", "Oso Hormiguero", "Castor", "Nutria", "Mapache", "Zorrillo", "Comadreja", "Visón", "Tejón", "Marmota", "Ardilla", "Topo", "Murciélago", "Cangrejo", "Langosta", "Camarón", "Calamar", "Pulpo", "Estrella de mar", "Erizo de mar", "Caballito de mar", "Medusa", "Coral", "Alce", "Ciervo"],
  raro: ["Lobo", "Zorro", "Oso", "Tigre", "León", "Pantera", "Guepardo", "Leopardo", "Jaguar", "Puma", "Lince", "Hiena", "Chacal", "Coyote", "Dingo", "Canguro", "Koala", "Wombat", "Demonio de Tasmania", "Ornitorrinco", "Equidna", "Panda", "Panda Rojo", "Mono", "Chimpancé", "Gorila", "Orangután", "Babuino", "Lémur", "Tucán", "Guacamayo", "Cacatúa", "Avestruz", "Emú", "Casuario", "Kiwi", "Pingüino", "Foca", "Morsa", "León Marino", "Manatí", "Dugongo", "Delfín", "Orca", "Ballena", "Tiburón", "Raya", "Pez Espada", "Pez Payaso", "Pez Globo", "Piraña", "Cocodrilo", "Caimán", "Pitón", "Boa", "Anaconda", "Cobra", "Víbora", "Cascabel", "Mamba", "Camaleón", "Gecko", "Dragón de Komodo", "Elefante", "Rinoceronte", "Hipopótamo", "Jirafa", "Cebra", "Camello"],
  epico: ["Lobo Blanco", "Tigre Blanco", "Pantera Negra", "León Dorado", "Oso Polar", "Zorro Ártico", "Águila Dorada", "Halcón Peregrino", "Cóndor", "Albatros", "Cisne Negro", "Pavo Real Albino", "Ajolote", "Narval", "Calamar Gigante", "Tiburón Blanco", "Megalodón Clonado", "T-Rex Clonado", "Velociraptor Clonado", "Triceratops Clonado", "Pterodáctilo Clonado", "Mamut Clonado", "Tigre Dientes de Sable", "Lobo Huargo", "Dodo Clonado"],
  mitologico: ["Dragón", "Fénix", "Grifo", "Unicornio", "Pegaso", "Cerbero", "Quimera", "Basilisco", "Kraken", "Leviatán", "Behemoth", "Manticora", "Esfinge", "Minotauro", "Centauro", "Sirena", "Tritón", "Kitsune", "Tengu", "Kappa", "Dragón Chino", "Qilin", "Roc", "Thunderbird", "Yeti", "Pie Grande", "Chupacabras", "Wendigo", "Gárgola", "Golem", "Slime", "Wyvern", "Hipogrifo", "Kelpie", "Barghest", "Guiverno", "Cthulhu Pequeño"]
};

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

function getPetVideo(type, state, level) {
  const stage = level >= NIVEL_EVOLUCION ? 'adulto' : 'bebe';
  
  // Reemplaza espacios por guiones bajos para que la IA lea "lobo_blanco_bebe_comiendo.mp4"
  const safeType = String(type).toLowerCase().replace(/\s+/g, '_');
  const fileName = `${safeType}_${stage}_${state}.mp4`;
  const filePath = path.join(PETS_DIR, fileName);

  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  } else {
    return null; 
  }
}

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
    const userKey = cleanJid(sender);
    const userData = await db.getUser(userKey);
    const now = Date.now();

    const petCommands = ['mascota', 'alimentar', 'jugar', 'entrenar', 'pasear', 'dormir', 'curar'];
    
    // 🔥 SISTEMA DE MUERTE: Si pasó de las 72 horas sin comer
    if (userData.pet && petCommands.includes(command)) {
      if (hoursPassed(userData.pet.lastFeed, 72)) {
        const p = userData.pet;
        const video = getPetVideo(p.type, 'sacrificada', p.level);
        const txt = `🪦 *Lamentablemente, ${p.name} ha fallecido por abandono.*\n\nPasó más de 3 días sin probar bocado y no resistió. Su alma se ha unido a la manada celestial...\n\n_Has sido bloqueado de adoptar nuevas mascotas. Pide piedad a un Owner._`;
        
        // Lo marcamos como "vetado" de adoptar
        userData.petGraveyard = true;
        delete userData.pet;
        await db.setUser(userKey, userData);

        if (video) return sock.sendMessage(remoteJid, { video, caption: txt, gifPlayback: true }, { quoted: msg });
        return sock.sendMessage(remoteJid, { text: txt }, { quoted: msg });
      }
    }

    // 1. ADOPTAR (Gacha / Suerte)
    if (command === 'adoptar') {
      if (userData.pet) {
        return sock.sendMessage(remoteJid, { text: `❌ Ya tienes una mascota llamada *${userData.pet.name}*. Cuídala bien.` }, { quoted: msg });
      }

      if (userData.petGraveyard) {
        return sock.sendMessage(remoteJid, { text: `💀 *Registro Manchado*\n\nDejaste morir a tu mascota anterior de hambre. La asociación protectora de animales no te permite adoptar de nuevo.\n\n_Solo un Owner puede darte otra oportunidad usando .sacrificar_` }, { quoted: msg });
      }

      const petName = args.join(' ') || 'Sin Nombre';

      // 🎲 RUEDA DE LA SUERTE (Gacha System)
      const roll = Math.random() * 100;
      let rareza = '';
      let pool = [];

      if (roll <= 5) { pool = ANIMALES.mitologico; rareza = '🌟 MITOLÓGICO 🌟'; } 
      else if (roll <= 15) { pool = ANIMALES.epico; rareza = '✨ ÉPICO ✨'; } 
      else if (roll <= 40) { pool = ANIMALES.raro; rareza = '🔵 RARO'; } 
      else { pool = ANIMALES.comun; rareza = '⚪ COMÚN'; }

      const randomType = pool[Math.floor(Math.random() * pool.length)];

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
      const text = `🎉 *¡MILAGRO DE VIDA!* 🎉\n\nEl destino ha elegido para ti un huevo de rareza *${rareza}*...\n¡Ha nacido tu *${randomType.toUpperCase()}* bebé!\n\nLe has puesto de nombre: *${petName}*\n\nUsa *.mascota* para ver cómo está y recuerda darle de comer.`;

      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }

    // 2. PERFIL DE LA MASCOTA
    if (command === 'mascota') {
      if (!userData.pet) return sock.sendMessage(remoteJid, { text: `❌ No tienes ninguna mascota. Usa *.adoptar [nombre]*` }, { quoted: msg });

      const p = userData.pet;
      const stage = p.level >= NIVEL_EVOLUCION ? 'Adulto 🔥' : 'Bebé 🐾';
      const horaActual = new Date().getHours();

      let estadoActual = 'contenta';
      let notaEstado = '¡Está muy feliz y lleno de energía!';

      if (hoursPassed(p.lastFeed, 24)) {
        estadoActual = 'enferma';
        notaEstado = '🤒 Está enfermo por no comer. Usa *.curar* y luego *.alimentar*.';
      } else if (hoursPassed(p.lastFeed, 12)) {
        estadoActual = 'enojada';
        notaEstado = '💢 Está de mal humor y con mucha hambre. Usa *.alimentar*.';
      } else if (hoursPassed(p.lastPlay, 24)) {
        estadoActual = 'triste';
        notaEstado = '😢 Está muy triste porque lo ignoras. Usa *.jugar*.';
      } else if (horaActual < 6 || horaActual >= 22) {
        estadoActual = 'durmiendo';
        notaEstado = '💤 Está durmiendo profundamente. Shhh...';
      }

      const video = getPetVideo(p.type, estadoActual, p.level);
      const text = `🐾 *PERFIL DE MASCOTA* 🐾\n\n👤 Dueño: ${pushName}\n🏷️ Nombre: *${p.name}*\n🧬 Raza: *${String(p.type).toUpperCase()}*\n📊 Nivel: *${p.level}* (${stage})\n✨ Experiencia: *${p.xp} XP*\n\n💭 Estado: ${notaEstado}`;

      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }

    // INTERACCIONES BÁSICAS
    if (!userData.pet && petCommands.includes(command)) {
      return sock.sendMessage(remoteJid, { text: `❌ No tienes mascota.` }, { quoted: msg });
    }

    const p = userData.pet;

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
        text += `\n\n✨ ¡WOW! *${p.name}* ha envuelto su cuerpo en un destello de luz y ha crecido.\n¡Ha evolucionado a su etapa Adulta!`;
      }

      const video = getPetVideo(p.type, estadoFinal, p.level);
      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    };

    if (command === 'alimentar') {
      const remaining = (2 * 60 * 60 * 1000) - (now - (p.lastFeed || 0));
      if (remaining > 0 && !hoursPassed(p.lastFeed, 24)) {
        const m = Math.floor(remaining / 60000);
        return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* no tiene hambre. Espera *${m} min*.` }, { quoted: msg });
      }
      p.lastFeed = now;
      return procesarAccion(Math.floor(Math.random() * 50) + 20, 'comiendo', `🍖 Le diste su comida favorita a *${p.name}*.`);
    }

    if (command === 'jugar') {
      if (hoursPassed(p.lastFeed, 12) && !hoursPassed(p.lastFeed, 24)) {
        return sock.sendMessage(remoteJid, { text: `💢 *${p.name}* rechaza el juguete. ¡Está furioso porque tiene hambre! Usa *.alimentar*.` }, { quoted: msg });
      }
      const remaining = (30 * 60 * 1000) - (now - (p.lastPlay || 0));
      if (remaining > 0) {
        const m = Math.floor(remaining / 60000);
        return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* está cansado. Espera *${m} min*.` }, { quoted: msg });
      }
      p.lastPlay = now;
      return procesarAccion(Math.floor(Math.random() * 20) + 10, 'jugando', `🎾 Lanzaste un juguete y jugaste con *${p.name}*.`);
    }

    if (command === 'entrenar') {
      if (hoursPassed(p.lastFeed, 12) && !hoursPassed(p.lastFeed, 24)) {
        return sock.sendMessage(remoteJid, { text: `💢 *${p.name}* se niega a entrenar. ¡Tiene hambre! Usa *.alimentar*.` }, { quoted: msg });
      }
      const remaining = (4 * 60 * 60 * 1000) - (now - (p.lastTrain || 0));
      if (remaining > 0) {
        const m = Math.floor(remaining / 60000);
        return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* está exhausto. Espera *${m} min*.` }, { quoted: msg });
      }
      p.lastTrain = now;
      return procesarAccion(Math.floor(Math.random() * 50) + 50, 'entrenando', `⚔️ Entrenaste las habilidades de *${p.name}*.`);
    }

    if (command === 'pasear') {
      const remaining = (60 * 60 * 1000) - (now - (p.lastWalk || 0));
      if (remaining > 0) {
        const m = Math.floor(remaining / 60000);
        return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* ya caminó suficiente. Espera *${m} min*.` }, { quoted: msg });
      }
      p.lastWalk = now;
      return procesarAccion(Math.floor(Math.random() * 30) + 15, 'paseando', `🌳 Fuiste a dar un paseo largo con *${p.name}*.`);
    }

    if (command === 'curar') {
      if (!hoursPassed(p.lastFeed, 24)) {
        return sock.sendMessage(remoteJid, { text: `✅ *${p.name}* goza de buena salud. No necesita medicina.` }, { quoted: msg });
      }
      p.lastFeed = now - (23 * 60 * 60 * 1000); 
      return procesarAccion(5, 'curando', `💊 Le diste medicina a *${p.name}*. ¡Se recuperó satisfactoriamente!`, true);
    }

    if (command === 'dormir') {
      const video = getPetVideo(p.type, 'durmiendo', p.level);
      const text = `💤 Mandaste a dormir a *${p.name}*. Respira lentamente mientras sueña...`;
      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }

    // 🔥 COMANDO DE OWNER: Sacrificar / Limpiar Historial
    if (command === 'sacrificar') {
      if (!isOwner) {
        return sock.sendMessage(remoteJid, { text: `❌ Solo los creadores del bot pueden decidir el destino final de las mascotas.` }, { quoted: msg });
      }

      const target = getTarget(msg, args);
      if (!target) return sock.sendMessage(remoteJid, { text: `❌ Debes mencionar al dueño de la mascota.` }, { quoted: msg });

      // Verificación de seguridad
      const requiereConfirmacion = !args.includes('confirmar');
      
      if (requiereConfirmacion) {
        return sock.sendMessage(remoteJid, { text: `⚠️ *ADVERTENCIA DE SEGURIDAD* ⚠️\n\nEstás a punto de borrar la mascota actual de este usuario, o limpiar su historial de muerte para que adopte una nueva.\n\nPara hacerlo, escribe: \n*.sacrificar @usuario confirmar*` }, { quoted: msg });
      }

      const targetData = await db.getUser(target);
      
      // Limpiamos todo rastro (mascota viva o mascota muerta)
      delete targetData.pet; 
      targetData.petGraveyard = false;
      await db.setUser(target, targetData);

      const text = `⚖️ El Owner ha hablado.\n\nEl registro de mascotas de @${cleanNumber(target)} ha sido reseteado. Ahora tiene el espacio libre para adoptar de nuevo.`;
      
      return sock.sendMessage(remoteJid, { text, mentions: [`${cleanNumber(target)}@s.whatsapp.net`] }, { quoted: msg });
    }
  }
};
