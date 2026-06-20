'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../lib/database');

const PETS_DIR = path.resolve(__dirname, '../media/mascotas');
const NIVEL_EVOLUCION = 10; 

// 🐾 BASE DE DATOS DE ANIMALES
const ANIMALES = {
  comun: ["Perro", "Gato", "Conejo", "Hámster", "Tortuga", "Loro", "Pato", "Gallina", "Cerdo", "Oveja", "Vaca", "Caballo", "Ratón", "Paloma", "Pavo", "Iguana", "Rana", "Sapo", "Pez Dorado", "Cabra", "Burro", "Ganso", "Hurón", "Erizo", "Cisne", "Cuervo", "Búho", "Lechuza", "Halcón", "Carpintero", "Pelícano", "Flamenco", "Armadillo", "Oso Hormiguero", "Castor", "Nutria", "Mapache", "Zorrillo", "Tejón", "Murciélago", "Cangrejo", "Alce", "Ciervo"],
  raro: ["Lobo", "Zorro", "Oso", "Tigre", "León", "Pantera", "Guepardo", "Leopardo", "Jaguar", "Puma", "Lince", "Hiena", "Chacal", "Coyote", "Dingo", "Canguro", "Gorila", "Chimpancé", "Orangután", "Babuino", "Tucán", "Guacamayo", "Avestruz", "Pingüino", "Foca", "Morsa", "Delfín", "Orca", "Tiburón", "Cocodrilo", "Caimán", "Pitón", "Boa", "Anaconda", "Cobra", "Víbora", "Dragón de Komodo", "Elefante", "Rinoceronte", "Hipopótamo", "Jirafa", "Cebra"],
  epico: ["Lobo Blanco", "Tigre Blanco", "Pantera Negra", "León Dorado", "Oso Polar", "Zorro Ártico", "Águila Dorada", "Halcón Peregrino", "Cóndor", "Cisne Negro", "Ajolote", "Tiburón Blanco", "Megalodón Clonado", "T-Rex Clonado", "Velociraptor Clonado", "Triceratops Clonado", "Mamut Clonado", "Tigre Dientes de Sable", "Lobo Huargo"],
  mitologico: ["Dragón", "Fénix", "Grifo", "Unicornio", "Pegaso", "Cerbero", "Quimera", "Basilisco", "Kraken", "Leviatán", "Behemoth", "Manticora", "Esfinge", "Minotauro", "Centauro", "Kitsune", "Dragón Chino", "Wyvern", "Hipogrifo", "Wendigo", "Gárgola", "Golem"]
};

// ⏱️ Función para pausas largas en la batalla para que puedan leer
const delay = ms => new Promise(res => setTimeout(res, ms));

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getTarget(msg, args) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);
  return null;
}

function getPetVideo(type, state, level) {
  const stage = level >= NIVEL_EVOLUCION ? 'adulto' : 'bebe';
  const safeType = String(type).toLowerCase().replace(/\s+/g, '_');
  const filePath = path.join(PETS_DIR, `${safeType}_${stage}_${state}.mp4`);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null; 
}

function hoursPassed(timestamp, hours) {
  return (Date.now() - (timestamp || 0)) > (hours * 60 * 60 * 1000);
}

// 💥 SISTEMA LÓGICO DE COMBATE Y MOVIMIENTOS BIOLÓGICOS
function getRarezaMascota(tipo) {
  for (const rareza in ANIMALES) {
    if (ANIMALES[rareza].includes(tipo)) {
      if (rareza === 'mitologico') return 2.0;
      if (rareza === 'epico') return 1.5;
      if (rareza === 'raro') return 1.2;
      return 1.0; 
    }
  }
  return 1.0;
}

function obtenerTextosCombate(tipo) {
  const t = String(tipo).toLowerCase();
  
  if (t.match(/(dragón|fénix|wyvern|dragón chino|quimera)/)) {
    return {
      ataque: "exhala una potente llamarada abrasadora",
      defensa: "usa sus gruesas escamas místicas para bloquear el impacto",
      remate: "envuelve a su rival en un tornado de fuego ardiente"
    };
  }
  if (t.match(/(cerbero|minotauro|golem|behemoth|gárgola|esfinge|manticora)/)) {
    return {
      ataque: "embiste con una fuerza demoledora y sobrenatural",
      defensa: "se planta firme y resiste como si fuera de roca sólida",
      remate: "aplasta brutalmente a su oponente contra el suelo"
    };
  }
  if (t.match(/(águila|halcón|cóndor|cuervo|búho|pato|loro|gaviota|fénix|cisne|pelícano|flamenco|avestruz|pingüino|grifo|pegaso)/)) {
    return {
      ataque: "cae en picada atacando con sus filosas garras",
      defensa: "alza vuelo rápidamente esquivando el peligro por completo",
      remate: "lanza un ataque aéreo certero apuntando directo a los ojos"
    };
  }
  if (t.match(/(serpiente|cobra|víbora|pitón|boa|anaconda|mamba|cocodrilo|caimán|iguana|dragón de komodo|basilisco|tortuga)/)) {
    return {
      ataque: "lanza una mordida ultrarrápida inyectando toxinas",
      defensa: "se desliza ágilmente por el suelo evadiendo el ataque",
      remate: "se enrosca en su presa, cortando su respiración hasta el fin"
    };
  }
  if (t.match(/(tiburón|orca|delfín|kraken|megalodón|foca|morsa|cangrejo|ajolote|leviatán)/)) {
    return {
      ataque: "lanza un feroz mordisco con hileras de dientes afilados",
      defensa: "se sumerge y usa su piel resbaladiza para desviar el daño",
      remate: "arrastra a su oponente dejándolo completamente sin salida"
    };
  }
  if (t.match(/(lobo|perro|zorro|coyote|tigre|león|pantera|gato|jaguar|lince|guepardo|puma|hiena|dientes de sable|huargo)/)) {
    return {
      ataque: "salta lanzando un zarpazo profundo",
      defensa: "da un ágil salto hacia atrás con reflejos felinos",
      remate: "clava sus colmillos directo en la yugular con furia asesina"
    };
  }
  if (t.match(/(oso|elefante|rinoceronte|hipopótamo|mamut|alce|ciervo|caballo|vaca|cerdo|oveja|cabra|burro)/)) {
    return {
      ataque: "carga a toda velocidad utilizando su gran peso",
      defensa: "usa su gruesa piel para absorber casi todo el impacto",
      remate: "arrolla y pisotea a su rival sin piedad alguna"
    };
  }
  
  // Por defecto (Roedores y criaturas pequeñas)
  return {
    ataque: "corre velozmente para dar un golpe sorpresa",
    defensa: "se esconde ágilmente en su entorno evadiendo el golpe",
    remate: "encuentra el punto débil y ataca sin dejar reaccionar"
  };
}

module.exports = {
  commands: ['adoptar', 'mascota', 'alimentar', 'jugar', 'entrenar', 'pasear', 'dormir', 'curar', 'sacrificar', 'perdonar', 'pelear'],
  
  async execute(ctx) {
    const { sock, remoteJid, msg, sender, args, command, isOwner, pushName } = ctx;
    const userKey = cleanJid(sender);
    const userData = await db.getUser(userKey);
    const now = Date.now();

    const petCommands = ['mascota', 'alimentar', 'jugar', 'entrenar', 'pasear', 'dormir', 'curar', 'pelear'];
    
    // 🔥 SISTEMA DE MUERTE POR ABANDONO
    if (userData.pet && petCommands.includes(command)) {
      if (hoursPassed(userData.pet.lastFeed, 72)) {
        const p = userData.pet;
        const video = getPetVideo(p.type, 'sacrificada', p.level);
        const txt = `🪦 *Lamentablemente, ${p.name} ha fallecido por abandono.*\n\nPasó más de 3 días sin probar bocado. \n_Has sido vetado de adoptar nuevas mascotas._`;
        
        userData.petGraveyard = true;
        delete userData.pet;
        await db.setUser(userKey, userData);

        if (video) return sock.sendMessage(remoteJid, { video, caption: txt, gifPlayback: true }, { quoted: msg });
        return sock.sendMessage(remoteJid, { text: txt }, { quoted: msg });
      }
    }

    // 1. ADOPTAR
    if (command === 'adoptar') {
      if (userData.pet) return sock.sendMessage(remoteJid, { text: `❌ Ya tienes a *${userData.pet.name}*. Cuídalo bien.` }, { quoted: msg });
      if (userData.petGraveyard) return sock.sendMessage(remoteJid, { text: `💀 *Registro Manchado*\nDejaste morir a tu mascota anterior. Pide al Owner que use .perdonar en ti.` }, { quoted: msg });

      const petName = args.join(' ') || 'Sin Nombre';
      const roll = Math.random() * 100;
      let rareza = '', pool = [];

      if (roll <= 5) { pool = ANIMALES.mitologico; rareza = '🌟 MITOLÓGICO 🌟'; } 
      else if (roll <= 15) { pool = ANIMALES.epico; rareza = '✨ ÉPICO ✨'; } 
      else if (roll <= 40) { pool = ANIMALES.raro; rareza = '🔵 RARO'; } 
      else { pool = ANIMALES.comun; rareza = '⚪ COMÚN'; }

      const randomType = pool[Math.floor(Math.random() * pool.length)];

      userData.pet = {
        name: petName, type: randomType, xp: 0, level: 1, lastFeed: now, lastPlay: now, lastTrain: 0, lastWalk: 0, lastBattle: 0
      };
      await db.setUser(userKey, userData);

      const video = getPetVideo(randomType, 'naciendo', 1);
      const text = `🎉 *¡NUEVO COMPAÑERO!* 🎉\n\nEl destino te ha entregado un huevo de rareza *${rareza}*...\n¡Ha nacido un *${randomType}*!\n\nNombre: *${petName}*\nUsa *.mascota* para verlo.`;

      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }

    // 2. PERFIL
    if (command === 'mascota') {
      if (!userData.pet) return sock.sendMessage(remoteJid, { text: `❌ No tienes ninguna mascota. Usa *.adoptar [nombre]*` }, { quoted: msg });

      const p = userData.pet;
      const stage = p.level >= NIVEL_EVOLUCION ? 'Adulto 🔥' : 'Bebé 🐾';
      const horaActual = new Date().getHours();
      let estadoActual = 'contenta', notaEstado = '¡Irradia felicidad y energía!';

      if (hoursPassed(p.lastFeed, 24)) { estadoActual = 'enferma'; notaEstado = '🤒 Está muy malherido o enfermo. Usa *.curar*.'; } 
      else if (hoursPassed(p.lastFeed, 12)) { estadoActual = 'enojada'; notaEstado = '💢 Está inquieto por el hambre. Usa *.alimentar*.'; } 
      else if (hoursPassed(p.lastPlay, 24)) { estadoActual = 'triste'; notaEstado = '😢 Se siente ignorado. Usa *.jugar*.'; } 
      else if (horaActual < 6 || horaActual >= 22) { estadoActual = 'durmiendo'; notaEstado = '💤 Descansa pacíficamente. Shhh...'; }

      const video = getPetVideo(p.type, estadoActual, p.level);
      const text = `🐾 *PERFIL DE MASCOTA* 🐾\n👤 Cuidador: ${pushName}\n🏷️ Nombre: *${p.name}*\n🧬 Especie: *${p.type}*\n📊 Nivel: *${p.level}* (${stage})\n✨ XP: *${p.xp}*\n💭 Estado: ${notaEstado}`;

      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }

    if (!userData.pet && petCommands.includes(command)) return sock.sendMessage(remoteJid, { text: `❌ No tienes criatura alguna.` }, { quoted: msg });

    const p = userData.pet;

    const procesarAccion = async (gainXP, newState, actionText, isHeal = false) => {
      if (!isHeal && hoursPassed(p.lastFeed, 24)) {
        return sock.sendMessage(remoteJid, { text: `🚑 *${p.name}* está demasiado débil o malherido. ¡Debes usar *.curar* primero!` }, { quoted: msg });
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
      if (evoluciono) text += `\n\n✨ ¡WOW! *${p.name}* brilló intensamente... ¡Ha evolucionado a su forma Adulta!`;

      const video = getPetVideo(p.type, estadoFinal, p.level);
      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    };

    // ACCIONES GENERALES
    if (command === 'alimentar') {
      const remaining = (2 * 60 * 60 * 1000) - (now - (p.lastFeed || 0));
      if (remaining > 0 && !hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* está lleno. Espera *${Math.floor(remaining / 60000)} min*.` }, { quoted: msg });
      p.lastFeed = now;
      return procesarAccion(Math.floor(Math.random() * 50) + 20, 'comiendo', `🍖 Has alimentado a *${p.name}*.`);
    }

    if (command === 'jugar') {
      if (hoursPassed(p.lastFeed, 12) && !hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `💢 *${p.name}* te ignora por hambre. Usa *.alimentar*.` }, { quoted: msg });
      const remaining = (30 * 60 * 1000) - (now - (p.lastPlay || 0));
      if (remaining > 0) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* necesita descansar. Espera *${Math.floor(remaining / 60000)} min*.` }, { quoted: msg });
      p.lastPlay = now;
      return procesarAccion(Math.floor(Math.random() * 20) + 10, 'jugando', `🎾 Te divertiste jugando con *${p.name}*.`);
    }

    if (command === 'entrenar') {
      if (hoursPassed(p.lastFeed, 12) && !hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `💢 *${p.name}* se niega a entrenar sin comer. Usa *.alimentar*.` }, { quoted: msg });
      const remaining = (4 * 60 * 60 * 1000) - (now - (p.lastTrain || 0));
      if (remaining > 0) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* está exhausto. Espera *${Math.floor(remaining / 60000)} min*.` }, { quoted: msg });
      p.lastTrain = now;
      return procesarAccion(Math.floor(Math.random() * 50) + 50, 'entrenando', `⚔️ Practicaste combate con *${p.name}*.`);
    }

    if (command === 'pasear') {
      const remaining = (60 * 60 * 1000) - (now - (p.lastWalk || 0));
      if (remaining > 0) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* ya se ejercitó. Espera *${Math.floor(remaining / 60000)} min*.` }, { quoted: msg });
      p.lastWalk = now;
      return procesarAccion(Math.floor(Math.random() * 30) + 15, 'paseando', `🌳 Fuiste de paseo con *${p.name}*.`);
    }

    if (command === 'curar') {
      if (!hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `✅ *${p.name}* goza de buena salud.` }, { quoted: msg });
      p.lastFeed = now - (23 * 60 * 60 * 1000); 
      return procesarAccion(5, 'curando', `💊 Trataste las heridas de *${p.name}*. ¡Ya está fuera de peligro!`, true);
    }

    if (command === 'dormir') {
      const video = getPetVideo(p.type, 'durmiendo', p.level);
      const text = `💤 *${p.name}* duerme plácidamente...`;
      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }

    // ⚔️ SISTEMA DE PELEAS (NARRADO, LENTO Y LÓGICO)
    if (command === 'pelear') {
      const target = getTarget(msg, args);
      if (!target) return sock.sendMessage(remoteJid, { text: `❌ Menciona a un rival.` }, { quoted: msg });
      if (target === userKey) return sock.sendMessage(remoteJid, { text: `❌ No puedes pelear contigo mismo.` }, { quoted: msg });

      const targetData = await db.getUser(target);
      if (!targetData.pet) return sock.sendMessage(remoteJid, { text: `❌ Ese usuario no tiene mascota.` }, { quoted: msg });

      const enemyPet = targetData.pet;
      if (hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `🚑 Tu mascota está herida. Usa *.curar* primero.` }, { quoted: msg });
      if (hoursPassed(enemyPet.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `🛑 El rival está herido. Sería cobarde atacarlo ahora.` }, { quoted: msg });
      
      const remaining = (60 * 60 * 1000) - (now - (p.lastBattle || 0));
      if (remaining > 0 && !isOwner && !userData.premium) {
        return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* descansa. Espera *${Math.floor(remaining / 60000)} min*.` }, { quoted: msg });
      }

      p.lastBattle = now;

      // --- CÁLCULO DE PODER ---
      const miMulti = getRarezaMascota(p.type);
      const rivalMulti = getRarezaMascota(enemyPet.type);
      const miPoder = p.level * miMulti * (p.level >= NIVEL_EVOLUCION ? 1.5 : 1.0);
      const rivalPoder = enemyPet.level * rivalMulti * (enemyPet.level >= NIVEL_EVOLUCION ? 1.5 : 1.0);

      // --- LÓGICA DE NIVELES EXACTA ---
      const difNiveles = p.level - enemyPet.level;
      let probGanar = 50;

      if (Math.abs(difNiveles) < 3) {
        // Diferencia de 0, 1 o 2 niveles = Pelea justa
        probGanar = (miPoder / (miPoder + rivalPoder)) * 100;
        if (probGanar > 70) probGanar = 70; // Balanceo
        if (probGanar < 30) probGanar = 30;
      } else {
        // Diferencia de 3 a más niveles = Dominio
        if (difNiveles > 0) {
          probGanar = 88; // El nivel alto gana casi siempre
        } else {
          probGanar = 12; // El nivel bajo solo tiene 12% (Golpe crítico/Suerte)
        }
      }

      const ganeYo = (Math.random() * 100) <= probGanar;
      const esGolpeCritico = (difNiveles <= -3 && ganeYo) || (difNiveles >= 3 && !ganeYo); // Si el nivel bajo gana
      const xpGanada = Math.floor(Math.random() * 50) + 50; 
      
      const loreMio = obtenerTextosCombate(p.type);
      const loreRival = obtenerTextosCombate(enemyPet.type);

      // --- FASE 1: ENTRADA (MÁS CORTA Y FÁCIL DE LEER) ---
      let texto = `⚔️ *C O M B A T E* ⚔️\n\n`;
      texto += `🥊 *${p.name}* (${p.type} Nvl ${p.level})\n`;
      texto += `🆚 *${enemyPet.name}* (${enemyPet.type} Nvl ${enemyPet.level})\n\n`;
      texto += `👀 Ambos animales se miran fijamente. ¡La batalla comienza!`;
      
      const mensajeBatalla = await sock.sendMessage(remoteJid, { text: texto, mentions: [target] }, { quoted: msg });
      await delay(5000); // Pausa larga de 5s

      // --- FASE 2: PRIMER ATAQUE ---
      texto += `\n\n💨 *TURNO 1:*\n`;
      if (ganeYo) {
        texto += `*${p.name}* ${loreMio.ataque}. *${enemyPet.name}* intenta bloquear, pero recibe daño grave.`;
      } else {
        texto += `*${p.name}* ${loreMio.ataque}, pero *${enemyPet.name}* ${loreRival.defensa}. ¡Evadió el daño!`;
      }
      
      await sock.sendMessage(remoteJid, { text: texto, edit: mensajeBatalla.key, mentions: [target] });
      await delay(6000); // Pausa larga de 6s para leer

      // --- FASE 3: CONTRAATAQUE Y CLÍMAX ---
      texto += `\n\n🔥 *TURNO 2:*\n`;
      if (ganeYo) {
        texto += `*${enemyPet.name}* intenta contraatacar con furia, pero *${p.name}* ${loreMio.defensa}.\n`;
        texto += `¡Aprovechando el fallo, *${p.name}* ${loreMio.remate}!`;
      } else {
        texto += `Aprovechando su velocidad, *${enemyPet.name}* ${loreRival.remate}! *${p.name}* no pudo evitarlo.`;
      }

      await sock.sendMessage(remoteJid, { text: texto, edit: mensajeBatalla.key, mentions: [target] });
      await delay(6000); // Pausa de 6s para suspenso final

      // --- FASE 4: RESOLUCIÓN Y CASTIGO ---
      texto += `\n\n🏆 *RESULTADO FINAL*\n`;
      if (esGolpeCritico) texto += `🌟 *¡GOLPE CRÍTICO MILAGROSO DE LA MASCOTA DE NIVEL BAJO!* 🌟\n`;

      if (ganeYo) {
        texto += `¡*${p.name}* es el ganador!\n`;
        texto += `🩸 *${enemyPet.name}* quedó herido de gravedad.\n⭐ Ganaste *+${xpGanada} XP*.`;
        p.xp += xpGanada;
        enemyPet.lastFeed = now - (25 * 60 * 60 * 1000); // Rival se enferma
      } else {
        texto += `¡*${enemyPet.name}* domina el campo y gana!\n`;
        texto += `🩸 *${p.name}* huye malherido. ¡Usa .curar pronto!\n⭐ El rival gana *+${xpGanada} XP*.`;
        enemyPet.xp += xpGanada;
        p.lastFeed = now - (25 * 60 * 60 * 1000); // Tú te enfermas
      }

      // Check Nivel
      const miNvl = Math.floor(p.xp / 200) + 1;
      if (miNvl > p.level) { p.level = miNvl; texto += `\n✨ ¡*${p.name}* sube a Nivel ${p.level}!`; }
      const eneNvl = Math.floor(enemyPet.xp / 200) + 1;
      if (eneNvl > enemyPet.level) { enemyPet.level = eneNvl; }

      await db.setUser(userKey, userData);
      await db.setUser(target, targetData);

      return sock.sendMessage(remoteJid, { text: texto, edit: mensajeBatalla.key, mentions: [target] });
    }

    // 🔥 SACRIFICAR / PERDONAR
    if (command === 'sacrificar') {
      if (!userData.pet) return sock.sendMessage(remoteJid, { text: `❌ No tienes mascota.` }, { quoted: msg });
      if (!args.includes('confirmar')) return sock.sendMessage(remoteJid, { text: `⚠️ Para sacrificar tu mascota y ser vetado, escribe:\n*.sacrificar confirmar*` }, { quoted: msg });

      userData.petGraveyard = true;
      delete userData.pet;
      await db.setUser(userKey, userData);
      return sock.sendMessage(remoteJid, { text: `☠️ Has sacrificado a tu mascota. El sistema te ha vetado.` }, { quoted: msg });
    }

    if (command === 'perdonar') {
      if (!isOwner) return sock.sendMessage(remoteJid, { text: `❌ Solo el Owner revoca vetos.` }, { quoted: msg });
      const target = getTarget(msg, args);
      if (!target) return sock.sendMessage(remoteJid, { text: `❌ Menciona al usuario vetado.` }, { quoted: msg });

      const targetData = await db.getUser(target);
      targetData.petGraveyard = false;
      await db.setUser(target, targetData);
      
      return sock.sendMessage(remoteJid, { text: `⚖️ *AMNISTÍA* concedida a @${cleanNumber(target)}. Ya puede usar *.adoptar*.`, mentions: [target] }, { quoted: msg });
    }
  }
};
