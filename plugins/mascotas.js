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

// ⏱️ Función para pausas en la batalla (Suspenso)
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

// 💥 SISTEMA DE LÓGICA DE COMBATE
function getRarezaMascota(tipo) {
  for (const rareza in ANIMALES) {
    if (ANIMALES[rareza].includes(tipo)) {
      if (rareza === 'mitologico') return 2.0;
      if (rareza === 'epico') return 1.5;
      if (rareza === 'raro') return 1.2;
      return 1.0; // Común
    }
  }
  return 1.0;
}

function obtenerAtaquePorEspecie(tipo) {
  const t = String(tipo).toLowerCase();
  
  if (t.match(/(dragón|fénix|quimera|basilisco|leviatán|wyvern|manticora|cerbero|gárgola|golem)/)) {
    const atk = ["desató su furia ancestral", "lanzó un ataque elemental", "usó magia antigua y letal", "rugió haciendo temblar el campo de batalla"];
    return atk[Math.floor(Math.random() * atk.length)];
  }
  if (t.match(/(águila|halcón|cóndor|cuervo|búho|pato|loro|gaviota|paloma|fénix|cisne|pelícano|flamenco|avestruz|pingüino)/)) {
    const atk = ["descendió en picada ferozmente", "atacó con sus garras afiladas", "dio un picotazo certero a los ojos", "creó un torbellino con sus alas"];
    return atk[Math.floor(Math.random() * atk.length)];
  }
  if (t.match(/(serpiente|cobra|víbora|pitón|boa|anaconda|mamba|cocodrilo|caimán|iguana|dragón de komodo)/)) {
    const atk = ["inyectó su veneno paralizante", "dio un coletazo rompehuesos", "usó sus fuertes mandíbulas", "se enrolló para asfixiar a su rival"];
    return atk[Math.floor(Math.random() * atk.length)];
  }
  if (t.match(/(tiburón|orca|delfín|kraken|megalodón|foca|morsa|cangrejo|ajolote)/)) {
    const atk = ["dio un feroz mordisco acuático", "golpeó con su fuerza bestial", "surgió de la nada para atacar", "atrapó a su presa con fuerza"];
    return atk[Math.floor(Math.random() * atk.length)];
  }
  if (t.match(/(lobo|perro|zorro|coyote|tigre|león|pantera|gato|oso|jaguar|lince|guepardo|puma|hiena)/)) {
    const atk = ["lanzó un zarpazo brutal", "dio un mordisco desgarrador", "embistió enseñando los colmillos", "atacó con instinto asesino"];
    return atk[Math.floor(Math.random() * atk.length)];
  }
  
  // Por defecto (herbívoros, roedores, etc)
  const atkDefault = ["dio una embestida contundente", "lanzó una fuerte patada", "usó un ataque sorpresa y veloz", "golpeó con todo su peso corporal"];
  return atkDefault[Math.floor(Math.random() * atkDefault.length)];
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
        const txt = `🪦 *Lamentablemente, ${p.name} ha fallecido por abandono.*\n\nPasó más de 3 días sin probar bocado y no resistió. Su energía se ha desvanecido...\n\n_Has sido vetado de adoptar nuevas mascotas. Solo el Owner puede darte una segunda oportunidad._`;
        
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
      if (userData.petGraveyard) return sock.sendMessage(remoteJid, { text: `💀 *Registro Manchado*\n\nDejaste morir a tu mascota anterior. El sistema no te permite adoptar de nuevo.\n\n_Pide al Owner que use .perdonar en ti._` }, { quoted: msg });

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
      const text = `🎉 *¡MILAGRO DE VIDA!* 🎉\n\nEl destino te ha entregado un ser de rareza *${rareza}*...\n¡Ha nacido un *${randomType}*!\n\nLe has puesto de nombre: *${petName}*\n\nUsa *.mascota* para ver cómo está.`;

      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }

    // 2. PERFIL DE LA MASCOTA
    if (command === 'mascota') {
      if (!userData.pet) return sock.sendMessage(remoteJid, { text: `❌ No tienes ninguna mascota. Usa *.adoptar [nombre]*` }, { quoted: msg });

      const p = userData.pet;
      const stage = p.level >= NIVEL_EVOLUCION ? 'Adulto 🔥' : 'Bebé 🐾';
      const horaActual = new Date().getHours();
      let estadoActual = 'contenta', notaEstado = '¡Irradia felicidad y energía!';

      if (hoursPassed(p.lastFeed, 24)) { estadoActual = 'enferma'; notaEstado = '🤒 Su salud decae por falta de alimento. Usa *.curar* y luego *.alimentar*.'; } 
      else if (hoursPassed(p.lastFeed, 12)) { estadoActual = 'enojada'; notaEstado = '💢 Está inquieto y de mal humor por el hambre. Usa *.alimentar*.'; } 
      else if (hoursPassed(p.lastPlay, 24)) { estadoActual = 'triste'; notaEstado = '😢 Se siente ignorado y triste. Usa *.jugar*.'; } 
      else if (horaActual < 6 || horaActual >= 22) { estadoActual = 'durmiendo'; notaEstado = '💤 Descansa pacíficamente. Shhh...'; }

      const video = getPetVideo(p.type, estadoActual, p.level);
      const text = `🐾 *PERFIL DE MASCOTA* 🐾\n\n👤 Cuidador: ${pushName}\n🏷️ Nombre: *${p.name}*\n🧬 Especie: *${p.type}*\n📊 Nivel: *${p.level}* (${stage})\n✨ Experiencia: *${p.xp} XP*\n\n💭 Estado: ${notaEstado}`;

      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }

    if (!userData.pet && petCommands.includes(command)) return sock.sendMessage(remoteJid, { text: `❌ No tienes criatura alguna a tu cuidado.` }, { quoted: msg });

    const p = userData.pet;

    const procesarAccion = async (gainXP, newState, actionText, isHeal = false) => {
      if (!isHeal && hoursPassed(p.lastFeed, 24)) {
        const videoEnferma = getPetVideo(p.type, 'enferma', p.level);
        const txt = `🤒 *${p.name}* está demasiado débil para moverse. Usa *.curar* primero.`;
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
      if (evoluciono) text += `\n\n✨ ¡INCREÍBLE! El cuerpo de *${p.name}* brilla intensamente...\n¡Ha evolucionado a su forma Adulta!`;

      const video = getPetVideo(p.type, estadoFinal, p.level);
      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    };

    // ACCIONES GENERALES
    if (command === 'alimentar') {
      const remaining = (2 * 60 * 60 * 1000) - (now - (p.lastFeed || 0));
      if (remaining > 0 && !hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* está satisfecho. Podrá comer de nuevo en *${Math.floor(remaining / 60000)} min*.` }, { quoted: msg });
      p.lastFeed = now;
      return procesarAccion(Math.floor(Math.random() * 50) + 20, 'comiendo', `🍖 Has alimentado a *${p.name}*. Devoró todo con ganas.`);
    }

    if (command === 'jugar') {
      if (hoursPassed(p.lastFeed, 12) && !hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `💢 *${p.name}* se agita y te ignora. ¡El hambre lo tiene de mal humor! Usa *.alimentar*.` }, { quoted: msg });
      const remaining = (30 * 60 * 1000) - (now - (p.lastPlay || 0));
      if (remaining > 0) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* necesita descansar. Juega en *${Math.floor(remaining / 60000)} min*.` }, { quoted: msg });
      p.lastPlay = now;
      return procesarAccion(Math.floor(Math.random() * 20) + 10, 'jugando', `🎾 Pasaste un buen rato divirtiéndote con *${p.name}*.`);
    }

    if (command === 'entrenar') {
      if (hoursPassed(p.lastFeed, 12) && !hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `💢 *${p.name}* se niega a obedecer por la falta de comida. Usa *.alimentar*.` }, { quoted: msg });
      const remaining = (4 * 60 * 60 * 1000) - (now - (p.lastTrain || 0));
      if (remaining > 0) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* está sin energía. Entrena en *${Math.floor(remaining / 60000)} min*.` }, { quoted: msg });
      p.lastTrain = now;
      return procesarAccion(Math.floor(Math.random() * 50) + 50, 'entrenando', `⚔️ Practicaste las habilidades de combate de *${p.name}*.`);
    }

    if (command === 'pasear') {
      const remaining = (60 * 60 * 1000) - (now - (p.lastWalk || 0));
      if (remaining > 0) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* ya se ejercitó bastante. Espera *${Math.floor(remaining / 60000)} min*.` }, { quoted: msg });
      p.lastWalk = now;
      return procesarAccion(Math.floor(Math.random() * 30) + 15, 'paseando', `🌳 Llevaste a *${p.name}* a explorar los alrededores.`);
    }

    if (command === 'curar') {
      if (!hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `✅ *${p.name}* goza de buena salud.` }, { quoted: msg });
      p.lastFeed = now - (23 * 60 * 60 * 1000); 
      return procesarAccion(5, 'curando', `💊 Aplicaste medicina a *${p.name}*. ¡Se está recuperando!`, true);
    }

    if (command === 'dormir') {
      const video = getPetVideo(p.type, 'durmiendo', p.level);
      const text = `💤 Mandaste a descansar a *${p.name}*. Cierra los ojos y respira plácidamente...`;
      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }

    // ⚔️ SISTEMA DE PELEAS NARRADO EN VIVO
    if (command === 'pelear') {
      const target = getTarget(msg, args);
      if (!target) return sock.sendMessage(remoteJid, { text: `❌ Menciona o responde al dueño de la mascota que quieres desafiar.` }, { quoted: msg });
      if (target === userKey) return sock.sendMessage(remoteJid, { text: `❌ Tu mascota no puede pelear contra su propia sombra.` }, { quoted: msg });

      const targetData = await db.getUser(target);
      if (!targetData.pet) return sock.sendMessage(remoteJid, { text: `❌ Ese usuario no tiene ninguna mascota para pelear.` }, { quoted: msg });

      const enemyPet = targetData.pet;
      
      if (hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `🤒 *${p.name}* está demasiado débil para pelear. Cúralo primero.` }, { quoted: msg });
      
      const remaining = (60 * 60 * 1000) - (now - (p.lastBattle || 0));
      if (remaining > 0) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* se está recuperando de su última batalla. Espera *${Math.floor(remaining / 60000)} min*.` }, { quoted: msg });

      p.lastBattle = now;

      const miMulti = getRarezaMascota(p.type);
      const rivalMulti = getRarezaMascota(enemyPet.type);
      
      const miPoder = p.level * miMulti;
      const rivalPoder = enemyPet.level * rivalMulti;

      let probGanar = (miPoder / (miPoder + rivalPoder)) * 100;
      if (probGanar > 90) probGanar = 90;
      if (probGanar < 10) probGanar = 10;

      const ganeYo = (Math.random() * 100) <= probGanar;
      const xpGanada = Math.floor(Math.random() * 50) + 50; 
      
      const atkMio = obtenerAtaquePorEspecie(p.type);
      const atkRival = obtenerAtaquePorEspecie(enemyPet.type);

      // FASE 1: DESAFÍO
      let texto = `⚔️ *BATALLA DE MASCOTAS* ⚔️\n\n🥊 *${p.name}* (${p.type} - Nvl ${p.level}) desafía a *${enemyPet.name}* (${enemyPet.type} - Nvl ${enemyPet.level})...`;
      const mensajeBatalla = await sock.sendMessage(remoteJid, { text: texto, mentions: [target] }, { quoted: msg });

      await delay(2500); // 2.5 segs

      // FASE 2: ATAQUE
      texto += `\n\n💨 ¡Inicia el combate!\n*${p.name}* ${atkMio}, mientras que *${enemyPet.name}* ${atkRival}...`;
      await sock.sendMessage(remoteJid, { text: texto, edit: mensajeBatalla.key, mentions: [target] });

      await delay(3000); // 3 segs

      // FASE 3: RESULTADO
      if (ganeYo) {
        texto += `\n\n🏆 ¡El poder de *${p.name}* prevaleció! Logró derrotar a su rival.\n⭐ Ganaste *+${xpGanada} XP*.`;
        p.xp += xpGanada;
      } else {
        texto += `\n\n💀 ¡*${enemyPet.name}* fue superior en combate! *${p.name}* huyó herido...\n⭐ El rival gana *+${xpGanada} XP*.`;
        enemyPet.xp += xpGanada;
      }

      const miNuevoNivel = Math.floor(p.xp / 200) + 1;
      if (miNuevoNivel > p.level) {
        p.level = miNuevoNivel;
        texto += `\n✨ ¡WOW! *${p.name}* ha subido al Nivel ${p.level}!`;
      }

      const enemigoNuevoNivel = Math.floor(enemyPet.xp / 200) + 1;
      if (enemigoNuevoNivel > enemyPet.level) {
        enemyPet.level = enemigoNuevoNivel;
      }

      await db.setUser(userKey, userData);
      await db.setUser(target, targetData);

      return sock.sendMessage(remoteJid, { text: texto, edit: mensajeBatalla.key, mentions: [target] });
    }

    // 🔥 SACRIFICIO Y PERDÓN
    if (command === 'sacrificar') {
      if (!userData.pet) return sock.sendMessage(remoteJid, { text: `❌ No tienes ninguna mascota para sacrificar.` }, { quoted: msg });
      if (!args.includes('confirmar')) return sock.sendMessage(remoteJid, { text: `⚠️ *ADVERTENCIA IRREVERSIBLE* ⚠️\n\nEstás a punto de sacrificar a *${userData.pet.name}*. Si lo haces, serás vetado.\n\nPara proceder, escribe:\n*.sacrificar confirmar*` }, { quoted: msg });

      const n = userData.pet.name, t = userData.pet.type, l = userData.pet.level;
      userData.petGraveyard = true;
      delete userData.pet;
      await db.setUser(userKey, userData);

      const video = getPetVideo(t, 'sacrificada', l);
      const text = `☠️ Has tomado la oscura decisión de sacrificar a *${n}*.\n\nEl sistema te ha vetado de futuras adopciones.`;

      if (video) return sock.sendMessage(remoteJid, { video, caption: text, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text }, { quoted: msg });
    }

    if (command === 'perdonar') {
      if (!isOwner) return sock.sendMessage(remoteJid, { text: `❌ Solo el Owner del bot tiene el poder de revocar vetos.` }, { quoted: msg });
      const target = getTarget(msg, args);
      if (!target) return sock.sendMessage(remoteJid, { text: `❌ Debes mencionar o responder al usuario vetado.` }, { quoted: msg });

      const targetData = await db.getUser(target);
      if (!targetData.petGraveyard) return sock.sendMessage(remoteJid, { text: `ℹ️ Este usuario tiene un registro limpio.` }, { quoted: msg });

      targetData.petGraveyard = false;
      await db.setUser(target, targetData);
      
      return sock.sendMessage(remoteJid, { text: `⚖️ *AMNISTÍA CONCEDIDA*\n\nEl Owner ha tenido piedad de @${cleanNumber(target)}. Ya puede volver a usar *.adoptar*.`, mentions: [target] }, { quoted: msg });
    }
  }
};
