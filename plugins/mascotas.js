'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../lib/database');

// 📂 RUTA DE TUS VIDEOS Y FOTOS
const PETS_DIR = path.resolve(__dirname, '../media/mascotas');
const NIVEL_EVOLUCION = 10; 

// 🐾 BASE DE DATOS GENÉTICA
const ANIMALES = {
  comun: ["Perro", "Gato", "Conejo", "Hámster", "Tortuga", "Loro", "Pato", "Gallina", "Cerdo", "Oveja", "Vaca", "Caballo", "Ratón", "Paloma", "Pavo", "Iguana", "Rana", "Sapo", "Pez Dorado", "Cabra", "Burro", "Ganso", "Hurón", "Erizo", "Cisne", "Cuervo", "Búho", "Lechuza", "Halcón", "Carpintero", "Pelícano", "Flamenco", "Armadillo", "Oso Hormiguero", "Castor", "Nutria", "Mapache", "Zorrillo", "Tejón", "Murciélago", "Cangrejo", "Alce", "Ciervo"],
  raro: ["Lobo", "Zorro", "Oso", "Tigre", "León", "Pantera", "Guepardo", "Leopardo", "Jaguar", "Puma", "Lince", "Hiena", "Chacal", "Coyote", "Dingo", "Canguro", "Gorila", "Chimpancé", "Orangután", "Babuino", "Tucán", "Guacamayo", "Avestruz", "Pingüino", "Foca", "Morsa", "Delfín", "Orca", "Tiburón", "Cocodrilo", "Caimán", "Pitón", "Boa", "Anaconda", "Cobra", "Víbora", "Dragón de Komodo", "Elefante", "Rinoceronte", "Hipopótamo", "Jirafa", "Cebra"],
  epico: ["Lobo Blanco", "Tigre Blanco", "Pantera Negra", "León Dorado", "Oso Polar", "Zorro Ártico", "Águila Dorada", "Halcón Peregrino", "Cóndor", "Cisne Negro", "Ajolote", "Tiburón Blanco", "Megalodón Clonado", "T-Rex Clonado", "Velociraptor Clonado", "Triceratops Clonado", "Mamut Clonado", "Tigre Dientes de Sable", "Lobo Huargo"],
  mitologico: ["Dragón", "Fénix", "Grifo", "Unicornio", "Pegaso", "Cerbero", "Quimera", "Basilisco", "Kraken", "Leviatán", "Behemoth", "Manticora", "Esfinge", "Minotauro", "Centauro", "Kitsune", "Dragón Chino", "Wyvern", "Hipogrifo", "Wendigo", "Gárgola", "Golem"]
};

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

// 🔥 SISTEMA DE ANIMACIONES (.mp4)
function getPetVideo(type, state, level) {
  const stage = level >= NIVEL_EVOLUCION ? 'adulto' : 'bebe';
  const safeType = String(type).toLowerCase().replace(/\s+/g, '_');
  const fileName = `${safeType}_${stage}_${state}.mp4`;
  const filePath = path.join(PETS_DIR, fileName);

  console.log(`[MASCOTAS] Buscando animación: ${fileName}`);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null; 
}

function hoursPassed(timestamp, hours) { return (Date.now() - (timestamp || 0)) > (hours * 60 * 60 * 1000); }

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

// 🧠 ADN: PREPARACIÓN, ATAQUE Y REMATE
function obtenerADN(tipo) {
  const t = String(tipo).toLowerCase();

  if (t.match(/(gato|tigre|león|pantera|guepardo|leopardo|jaguar|puma|lince|dientes de sable)/)) {
    return { preparacion: "mueve la cola lentamente mientras sus pupilas se dilatan", ataque: "salta impulsado ágilmente con las garras desenfundadas", remate: "salta directo a la yugular con una precisión felina y letal" };
  }
  if (t.match(/(perro|lobo|zorro|coyote|chacal|dingo|hiena|huargo)/)) {
    return { preparacion: "gruñe bajando las orejas y mostrando los colmillos", ataque: "se abalanza corriendo para morder las extremidades", remate: "clava sus colmillos profundamente y sacude su cabeza con brutalidad" };
  }
  if (t.match(/(serpiente|cobra|víbora|pitón|boa|anaconda|mamba)/)) {
    return { preparacion: "sisea amenazadoramente levantando la cabeza", ataque: "lanza una mordida ultrarrápida como un látigo", remate: "se enrosca alrededor del rival, rompiendo sus huesos" };
  }
  if (t.match(/(cocodrilo|caimán|iguana|camaleón|dragón de komodo|rana|sapo|tortuga|ajolote|t-rex|velociraptor)/)) {
    return { preparacion: "abre sus fauces en señal de amenaza y se planta firme", ataque: "da un poderoso coletazo buscando derribar", remate: "muerde profundamente y realiza el devastador giro de la muerte" };
  }
  if (t.match(/(águila|halcón|cóndor|cuervo|búho|lechuza|carpintero|pelícano)/)) {
    return { preparacion: "extiende sus alas y lanza un chillido ensordecedor", ataque: "cae en picada desde el aire a una velocidad vertiginosa", remate: "golpea directo en el punto ciego con el pico" };
  }
  if (t.match(/(pato|gallina|loro|paloma|pavo|ganso|codorniz|cisne|gaviota|gorrión|golondrina|flamenco|cigüeña|avestruz|emú|casuario|kiwi|pingüino)/)) {
    return { preparacion: "agita sus plumas frenéticamente preparándose para el caos", ataque: "ataca corriendo y lanzando picotazos rápidos", remate: "desata una ráfaga de picotazos veloces que abruman al oponente" };
  }
  if (t.match(/(oso|elefante|rinoceronte|hipopótamo|jirafa|cebra|camello|alce|ciervo|vaca|caballo|cerdo|oveja|cabra|burro|mamut|triceratops)/)) {
    return { preparacion: "bufa violentamente y raspa la tierra con fuerza", ataque: "carga a toda velocidad utilizando su inmenso peso corporal", remate: "se alza y aplasta a su oponente bajo su peso" };
  }
  if (t.match(/(conejo|hámster|ratón|cobaya|hurón|erizo|perezoso|armadillo|oso hormiguero|castor|nutria|mapache|zorrillo|comadreja|visón|tejón|marmota|ardilla|topo|murciélago)/)) {
    return { preparacion: "olfatea el aire rápidamente y adopta una postura escurridiza", ataque: "corre a máxima velocidad para morder una zona baja", remate: "trepa rápidamente y muerde un punto vital" };
  }
  if (t.match(/(pez|foca|morsa|manatí|dugongo|delfín|orca|ballena|tiburón|raya|cangrejo|langosta|camarón|calamar|pulpo|estrella|erizo de mar|caballito|medusa|coral|megalodón)/)) {
    return { preparacion: "agita su entorno preparándose para cazar", ataque: "se impulsa como un torpedo para dar un fuerte impacto", remate: "atrapa a su presa arrastrándola en un frenesí de mordiscos" };
  }
  if (t.match(/(dragón|fénix|wyvern|qilin|thunderbird|roc)/)) {
    return { preparacion: "emana un aura mágica e ilumina todo el lugar", ataque: "exhala una potente llamarada abrasadora", remate: "envuelve a su rival en un apocalíptico tornado de fuego" };
  }
  if (t.match(/(golem|minotauro|cerbero|behemoth|manticora|esfinge|gárgola|yeti|pie grande|wendigo)/)) {
    return { preparacion: "hace temblar la tierra con un rugido sobrenatural", ataque: "embiste con una fuerza mágica y demoledora", remate: "desata su ira aplastando y destruyendo todo a su paso" };
  }
  if (t.match(/(kraken|leviatán|unicornio|pegaso|sirena|tritón|kitsune|tengu|kappa|slime|chupacabras)/)) {
    return { preparacion: "distorsiona la realidad a su alrededor", ataque: "ataca usando magia oscura o poder ancestral", remate: "atrapa a su oponente arrastrándolo a la oscuridad eterna" };
  }
  return { preparacion: "adopta una postura defensiva pero valiente", ataque: "corre velozmente para dar un golpe", remate: "encuentra un punto débil y no perdona" };
}

module.exports = {
  commands: ['adoptar', 'mascota', 'alimentar', 'jugar', 'entrenar', 'pasear', 'dormir', 'curar', 'sacrificar', 'perdonar', 'pelear', 'darmascota'],
  
  async execute(ctx) {
    const { sock, remoteJid, msg, sender, args, command, isOwner, pushName } = ctx;
    const userKey = cleanJid(sender);
    const userData = await db.getUser(userKey);
    const now = Date.now();
    const petCommands = ['mascota', 'alimentar', 'jugar', 'entrenar', 'pasear', 'dormir', 'curar', 'pelear'];
    
    // 🔥 SISTEMA DE MUERTE POR ABANDONO
    if (userData.pet && petCommands.includes(command) && hoursPassed(userData.pet.lastFeed, 72)) {
      const p = userData.pet;
      const video = getPetVideo(p.type, 'sacrificada', p.level);
      const txt = `🪦 *Lamentablemente, ${p.name}(${p.type}) ha fallecido por abandono.*\n\nPasó más de 3 días sin probar bocado y no resistió. Su energía se ha desvanecido...\n\n_Has sido vetado de adoptar nuevas mascotas. Pide piedad a un Owner._`;
      userData.petGraveyard = true; delete userData.pet; await db.setUser(userKey, userData);
      
      if (video) return sock.sendMessage(remoteJid, { video, caption: txt, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text: txt }, { quoted: msg });
    }

    // 1. ADOPTAR (CON MENÚ DE AYUDA)
    if (command === 'adoptar') {
      if (!args.length) {
        const menuMascotas = `🐾 *CENTRO DE ADOPCIÓN* 🐾\n\nPara adoptar a tu compañero, debes especificar un nombre.\n*Uso:* \`.adoptar [Nombre]\`\n*Ejemplo:* \`.adoptar Zeus\`\n\n📜 *COMANDOS DISPONIBLES:*\n🔸 \`.mascota\` - Ver perfil y estado.\n🔸 \`.alimentar\` - Dale de comer (cada 2h).\n🔸 \`.jugar\` - Diviértete con él (cada 30m).\n🔸 \`.entrenar\` - Gana mucha XP (cada 4h).\n🔸 \`.pasear\` - Gana XP leve (cada 1h).\n🔸 \`.dormir\` - Mandar a dormir.\n🔸 \`.curar\` - Sana heridas urgentes.\n🔸 \`.pelear @user\` - Combate por la gloria.\n🔸 \`.sacrificar\` - Despedida irreversible.`;
        return sock.sendMessage(remoteJid, { text: menuMascotas }, { quoted: msg });
      }

      if (userData.pet) return sock.sendMessage(remoteJid, { text: `❌ Ya tienes a *${userData.pet.name}(${userData.pet.type})*.` }, { quoted: msg });
      if (userData.petGraveyard) return sock.sendMessage(remoteJid, { text: `💀 *Registro Manchado*\n\nDejaste morir a tu mascota anterior. El sistema no te permite adoptar de nuevo.\n\n_Pide al Owner que use .perdonar en ti._` }, { quoted: msg });

      const petName = args.join(' ');
      const roll = Math.random() * 100;
      let rareza = '', pool = [];

      if (roll <= 5) { pool = ANIMALES.mitologico; rareza = '🌟 MITOLÓGICO 🌟'; } 
      else if (roll <= 15) { pool = ANIMALES.epico; rareza = '✨ ÉPICO ✨'; } 
      else if (roll <= 40) { pool = ANIMALES.raro; rareza = '🔵 RARO'; } 
      else { pool = ANIMALES.comun; rareza = '⚪ COMÚN'; }

      const randomType = pool[Math.floor(Math.random() * pool.length)];

      userData.pet = { name: petName, type: randomType, xp: 0, level: 1, lastFeed: now, lastPlay: now, lastTrain: 0, lastWalk: 0, lastBattle: 0 };
      await db.setUser(userKey, userData);

      const video = getPetVideo(randomType, 'naciendo', 1);
      const txt = `🎉 *¡MILAGRO DE VIDA!* 🎉\n\nEl destino ha elegido para ti un huevo de rareza *${rareza}*...\n¡Ha nacido tu *${randomType.toUpperCase()}* bebé!\n\nLe has puesto de nombre: *${petName}*\n\nUsa *.mascota* para ver cómo está y recuerda darle de comer.`;
      
      if (video) return sock.sendMessage(remoteJid, { video, caption: txt, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text: txt }, { quoted: msg });
    }

    // 👑 COMANDO EXCLUSIVO OWNER: DAR MASCOTA ESPECÍFICA
    if (command === 'darmascota') {
      if (!isOwner) return sock.sendMessage(remoteJid, { text: `❌ Solo los Dioses (Owners) pueden crear criaturas a voluntad.` }, { quoted: msg });
      
      const target = getTarget(msg, args);
      if (!target) return sock.sendMessage(remoteJid, { text: `❌ Menciona al usuario.\n*Uso:* .darmascota @user Raza | Nombre` }, { quoted: msg });

      const partesTexto = args.join(' ').split('|');
      if (partesTexto.length < 2) return sock.sendMessage(remoteJid, { text: `❌ Formato incorrecto.\n*Uso:* .darmascota @user Raza | Nombre\n*Ejemplo:* .darmascota @user Dragón | Bahamut` }, { quoted: msg });

      // Limpiar la raza (removiendo menciones) y el nombre
      const razaBuscada = partesTexto[0].replace(/@\d+/g, '').trim().toLowerCase();
      const nombreElegido = partesTexto[1].trim() || 'Criatura';

      let razaOficial = null;
      for (const rareza in ANIMALES) {
        const match = ANIMALES[rareza].find(a => a.toLowerCase() === razaBuscada);
        if (match) {
          razaOficial = match;
          break;
        }
      }

      if (!razaOficial) return sock.sendMessage(remoteJid, { text: `❌ La raza "${partesTexto[0].replace(/@\d+/g, '').trim()}" no existe en la base de datos de ADN.` }, { quoted: msg });

      const targetData = await db.getUser(target);
      targetData.pet = { name: nombreElegido, type: razaOficial, xp: 0, level: 1, lastFeed: now, lastPlay: now, lastTrain: 0, lastWalk: 0, lastBattle: 0 };
      targetData.petGraveyard = false; // Se le perdona automáticamente si estaba vetado
      await db.setUser(target, targetData);

      return sock.sendMessage(remoteJid, { text: `🎁 *REGALO DIVINO*\n\nEl Owner ha concedido a @${cleanNumber(target)} un majestuoso *${razaOficial}* llamado *${nombreElegido}*.`, mentions: [target] }, { quoted: msg });
    }

    // 2. PERFIL
    if (command === 'mascota') {
      if (!userData.pet) return sock.sendMessage(remoteJid, { text: `❌ No tienes mascota.` }, { quoted: msg });
      const p = userData.pet;
      const stage = p.level >= NIVEL_EVOLUCION ? 'Adulto 🔥' : 'Bebé 🐾';
      
      let estadoActual = 'contenta';
      let notaEstado = '¡Irradia felicidad y energía!';

      if (hoursPassed(p.lastFeed, 24)) { estadoActual = 'enferma'; notaEstado = '🤒 Su salud decae por falta de alimento. Usa *.curar* y luego *.alimentar*.'; } 
      else if (hoursPassed(p.lastFeed, 12)) { estadoActual = 'enojada'; notaEstado = '💢 Está inquieto y de mal humor por el hambre. Usa *.alimentar*.'; } 
      else if (hoursPassed(p.lastPlay, 24)) { estadoActual = 'triste'; notaEstado = '😢 Se siente ignorado y triste. Usa *.jugar*.'; } 
      else if (new Date().getHours() < 6 || new Date().getHours() >= 22) { estadoActual = 'durmiendo'; notaEstado = '💤 Descansa pacíficamente. Shhh...'; }
      
      const video = getPetVideo(p.type, estadoActual, p.level);
      const txt = `🐾 *PERFIL DE MASCOTA* 🐾\n\n👤 Cuidador: ${pushName}\n🏷️ Nombre: *${p.name}*\n🧬 Raza: *${String(p.type).toUpperCase()}*\n📊 Nivel: *${p.level}* (${stage})\n✨ Experiencia: *${p.xp} XP*\n\n💭 Estado: ${notaEstado}`;
      
      if (video) return sock.sendMessage(remoteJid, { video, caption: txt, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text: txt }, { quoted: msg });
    }

    if (!userData.pet && petCommands.includes(command)) return sock.sendMessage(remoteJid, { text: `❌ No tienes criatura alguna a tu cuidado.` }, { quoted: msg });
    const p = userData.pet;

    // 🔥 FUNCIÓN CENTRAL DE ANIMACIONES Y DETALLES PARA ALIMENTAR, JUGAR, ETC.
    const procesarAccion = async (gainXP, newState, actionText, isHeal = false) => {
      if (!isHeal && hoursPassed(p.lastFeed, 24)) {
        const videoEnferma = getPetVideo(p.type, 'enferma', p.level);
        const txt = `🤒 *${p.name}(${p.type})* está demasiado débil para moverse. Usa *.curar* primero.`;
        if (videoEnferma) return sock.sendMessage(remoteJid, { video: videoEnferma, caption: txt, gifPlayback: true }, { quoted: msg });
        return sock.sendMessage(remoteJid, { text: txt }, { quoted: msg });
      }

      p.xp += gainXP;
      let evoluciono = false;
      const newLevel = Math.floor(p.xp / 200) + 1;
      
      if (newLevel > p.level) {
        if (p.level < NIVEL_EVOLUCION && newLevel >= NIVEL_EVOLUCION) evoluciono = true;
        p.level = newLevel;
      }
      await db.setUser(userKey, userData);

      const estadoFinal = evoluciono ? 'evolucionando' : newState;
      let txtFinal = `${actionText}\n⭐ Ganó *+${gainXP} XP*.`;
      if (evoluciono) txtFinal += `\n\n✨ ¡INCREÍBLE! El cuerpo de *${p.name}* brilla intensamente...\n¡Ha evolucionado a su forma Adulta!`;

      const video = getPetVideo(p.type, estadoFinal, p.level);
      if (video) return sock.sendMessage(remoteJid, { video, caption: txtFinal, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text: txtFinal }, { quoted: msg });
    };

    if (command === 'alimentar') {
      const remaining = (2 * 60 * 60 * 1000) - (now - (p.lastFeed || 0));
      if (remaining > 0 && !hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}(${p.type})* no tiene hambre. Espera *${Math.floor(remaining / 60000)} min*.` }, { quoted: msg });
      p.lastFeed = now; return procesarAccion(30, 'comiendo', `🍖 Le diste su comida favorita a *${p.name}(${p.type})*. Devoró todo con ganas.`);
    }
    if (command === 'jugar') {
      const remaining = (30 * 60 * 1000) - (now - (p.lastPlay || 0));
      if (hoursPassed(p.lastFeed, 12) && !hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `💢 *${p.name}(${p.type})* te ignora por hambre. Usa *.alimentar*.` }, { quoted: msg });
      if (remaining > 0) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}(${p.type})* está cansado. Espera *${Math.floor(remaining / 60000)} min*.` }, { quoted: msg });
      p.lastPlay = now; return procesarAccion(15, 'jugando', `🎾 Pasaste un buen rato divirtiéndote con *${p.name}(${p.type})*.`);
    }
    if (command === 'entrenar') {
      const remaining = (4 * 60 * 60 * 1000) - (now - (p.lastTrain || 0));
      if (hoursPassed(p.lastFeed, 12) && !hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `💢 *${p.name}(${p.type})* se niega a entrenar sin comer. Usa *.alimentar*.` }, { quoted: msg });
      if (remaining > 0) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}(${p.type})* está exhausto. Espera *${Math.floor(remaining / 60000)} min*.` }, { quoted: msg });
      p.lastTrain = now; return procesarAccion(60, 'entrenando', `⚔️ Practicaste combate y mejoraste las habilidades de *${p.name}(${p.type})*.`);
    }
    if (command === 'pasear') {
      const remaining = (60 * 60 * 1000) - (now - (p.lastWalk || 0));
      if (remaining > 0) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}(${p.type})* ya caminó suficiente. Espera *${Math.floor(remaining / 60000)} min*.` }, { quoted: msg });
      p.lastWalk = now; return procesarAccion(20, 'paseando', `🌳 Fuiste a pasear tranquilamente con *${p.name}(${p.type})*.`);
    }
    if (command === 'curar') {
      if (!hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `✅ *${p.name}(${p.type})* goza de buena salud.` }, { quoted: msg });
      p.lastFeed = now - (23 * 60 * 60 * 1000); return procesarAccion(5, 'curando', `💊 Aplicaste medicina a *${p.name}(${p.type})*. ¡Se está recuperando!`, true);
    }
    if (command === 'dormir') {
      const video = getPetVideo(p.type, 'durmiendo', p.level);
      const txt = `💤 Mandaste a descansar a *${p.name}(${p.type})*. Respira pacíficamente...`;
      if (video) return sock.sendMessage(remoteJid, { video, caption: txt, gifPlayback: true }, { quoted: msg });
      return sock.sendMessage(remoteJid, { text: txt }, { quoted: msg });
    }

    // ⚔️ SISTEMA DE COMBATE (IMAGEN VS, TEXTOS CORTOS REEMPLAZABLES, 5 NIVELES DIFF)
    if (command === 'pelear') {
      const target = getTarget(msg, args);
      if (!target) return sock.sendMessage(remoteJid, { text: `❌ Menciona a tu rival.` }, { quoted: msg });
      if (target === userKey) return sock.sendMessage(remoteJid, { text: `❌ No pelees solo.` }, { quoted: msg });

      const targetData = await db.getUser(target);
      if (!targetData.pet) return sock.sendMessage(remoteJid, { text: `❌ El rival no tiene mascota.` }, { quoted: msg });
      const enemyPet = targetData.pet;
      
      const n1 = `${p.name}(${p.type})`;
      const n2 = `${enemyPet.name}(${enemyPet.type})`;

      if (hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `🚑 *${n1}* está muy herido. Usa .curar.` }, { quoted: msg });
      if (hoursPassed(enemyPet.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `🛑 *${n2}* está herido. Cobarde.` }, { quoted: msg });
      
      const cooldown = (60 * 60 * 1000) - (now - (p.lastBattle || 0));
      if (cooldown > 0 && !isOwner && !userData.premium) return sock.sendMessage(remoteJid, { text: `⏳ *${n1}* descansa. Espera *${Math.floor(cooldown / 60000)} min*.` }, { quoted: msg });
      p.lastBattle = now;

      // Matemáticas de Poder y Niveles (Diferencia de 5)
      const miPoder = p.level * getRarezaMascota(p.type) * (p.level >= NIVEL_EVOLUCION ? 1.5 : 1.0);
      const rivalPoder = enemyPet.level * getRarezaMascota(enemyPet.type) * (enemyPet.level >= NIVEL_EVOLUCION ? 1.5 : 1.0);
      const dif = p.level - enemyPet.level;
      let probGanar = 50;

      if (Math.abs(dif) <= 5) {
        // Diferencia de 5 niveles o menos = Pelea Par a Par
        probGanar = Math.min(Math.max((miPoder / (miPoder + rivalPoder)) * 100, 30), 70); 
      } else {
        // Diferencia de 6 niveles o más = Dominio absoluto del superior (12% crítico para el débil)
        probGanar = dif > 0 ? 88 : 12; 
      }

      const ganeYo = (Math.random() * 100) <= probGanar;
      const xpBatalla = Math.floor(Math.random() * 60) + 60; 
      const adnMio = obtenerADN(p.type);
      const adnRival = obtenerADN(enemyPet.type);

      // 🖼️ FOTO DEL VS
      const vsImagePath = path.join(PETS_DIR, 'vs.jpg');
      if (fs.existsSync(vsImagePath)) {
        await sock.sendMessage(remoteJid, { image: fs.readFileSync(vsImagePath), caption: `⚔️ *¡EL COMBATE VA A COMENZAR!*\n\n${n1} 🆚 ${n2}` }, { quoted: msg });
      } else {
        await sock.sendMessage(remoteJid, { text: `⚔️ *¡EL COMBATE VA A COMENZAR!*\n\n${n1} 🆚 ${n2}` }, { quoted: msg });
      }

      // EDICIÓN 1: Preparación (10 seg)
      let texto = `⚔️ *${n1}* ${adnMio.preparacion} para enfrentar a *${n2}*.`;
      const msgBatalla = await sock.sendMessage(remoteJid, { text: texto, mentions: [target] });
      await delay(10000); 

      // EDICIÓN 2: El Ataque (10 seg)
      texto = `💨 *${n1}* toma la iniciativa y ${adnMio.ataque}!`;
      await sock.sendMessage(remoteJid, { text: texto, edit: msgBatalla.key, mentions: [target] });
      await delay(10000);

      // EDICIÓN 3: El Remate (10 seg)
      if (ganeYo) {
        texto = `🔥 *${n2}* intenta resistir, pero *${n1}* no tiene piedad y ${adnMio.remate}!`;
      } else {
        texto = `🔥 *${n2}* resiste sin problemas, aprovecha una apertura y ${adnRival.remate}!`;
      }
      await sock.sendMessage(remoteJid, { text: texto, edit: msgBatalla.key, mentions: [target] });
      await delay(10000);

      // EDICIÓN 4: Resultado Inmediato (2 seg antes del resumen)
      texto = ganeYo ? `🏆 ¡*${n1}* ha derrotado por completo a *${n2}*!` : `💀 ¡*${n2}* destruye a *${n1}* sin esfuerzo!`;
      await sock.sendMessage(remoteJid, { text: texto, edit: msgBatalla.key, mentions: [target] });
      await delay(2000); 

      // MENSAJE FINAL: RESUMEN SEPARADO
      let txtResumen = `📜 *RESUMEN DE LA BATALLA* 📜\n\n`;
      if (ganeYo) {
        txtResumen += `🏆 *GANADOR:* ${n1} (+${xpBatalla} XP)\n🩸 *PERDEDOR:* ${n2} (Requiere .curar)\n`;
        p.xp += xpBatalla;
        enemyPet.lastFeed = now - (25 * 60 * 60 * 1000); // Castigo
      } else {
        txtResumen += `🏆 *GANADOR:* ${n2} (+${xpBatalla} XP)\n🩸 *PERDEDOR:* ${n1} (Requiere .curar)\n`;
        enemyPet.xp += xpBatalla;
        p.lastFeed = now - (25 * 60 * 60 * 1000); // Castigo
      }

      if (Math.floor(p.xp / 200) + 1 > p.level) {
        p.level = Math.floor(p.xp / 200) + 1;
        txtResumen += `\n✨ ¡${p.name} subió al Nivel ${p.level}!`;
      }
      if (Math.floor(enemyPet.xp / 200) + 1 > enemyPet.level) {
        enemyPet.level = Math.floor(enemyPet.xp / 200) + 1;
      }

      await db.setUser(userKey, userData);
      await db.setUser(target, targetData);
      return sock.sendMessage(remoteJid, { text: txtResumen, mentions: [target] });
    }

    // 🔥 SACRIFICAR / PERDONAR
    if (command === 'sacrificar') {
      if (!userData.pet) return sock.sendMessage(remoteJid, { text: `❌ No tienes mascota.` }, { quoted: msg });
      if (!args.includes('confirmar')) return sock.sendMessage(remoteJid, { text: `⚠️ Escribe: *.sacrificar confirmar*` }, { quoted: msg });
      userData.petGraveyard = true; delete userData.pet; await db.setUser(userKey, userData);
      return sock.sendMessage(remoteJid, { text: `☠️ Mascota sacrificada. Has sido vetado.` }, { quoted: msg });
    }
    if (command === 'perdonar') {
      if (!isOwner) return sock.sendMessage(remoteJid, { text: `❌ Solo el Owner revoca vetos.` }, { quoted: msg });
      const target = getTarget(msg, args);
      if (!target) return sock.sendMessage(remoteJid, { text: `❌ Menciona al usuario vetado.` }, { quoted: msg });
      const targetData = await db.getUser(target);
      targetData.petGraveyard = false; await db.setUser(target, targetData);
      return sock.sendMessage(remoteJid, { text: `⚖️ Vetación revocada a @${cleanNumber(target)}.`, mentions: [target] }, { quoted: msg });
    }
  }
};
