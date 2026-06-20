'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../lib/database');

const PETS_DIR = path.resolve(__dirname, '../media/mascotas');
const NIVEL_EVOLUCION = 10; 

// 🐾 BASE DE DATOS GENÉTICA DE MASCOTAS
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

function getPetVideo(type, state, level) {
  const stage = level >= NIVEL_EVOLUCION ? 'adulto' : 'bebe';
  const safeType = String(type).toLowerCase().replace(/\s+/g, '_');
  const filePath = path.join(PETS_DIR, `${safeType}_${stage}_${state}.mp4`);
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

// 🧠 CEREBRO BIOLÓGICO: ADN Y MOVIMIENTOS EXACTOS POR RAZA
function obtenerADN(tipo) {
  const t = String(tipo).toLowerCase();

  // 1. FELINOS
  if (t.match(/(gato|tigre|león|pantera|guepardo|leopardo|jaguar|puma|lince|dientes de sable)/)) {
    return {
      preparacion: "mueve la cola lentamente mientras sus pupilas se dilatan",
      ataque: "salta impulsado ágilmente con las garras desenfundadas",
      defensa: "se contorsiona en el aire cayendo de pie y evadiendo el daño con agilidad felina",
      contra: "suelta un zarpazo rápido y cortante a la cara de su rival",
      remate: "salta directo a la yugular con una precisión felina y letal"
    };
  }
  // 2. CANINOS
  if (t.match(/(perro|lobo|zorro|coyote|chacal|dingo|hiena|huargo)/)) {
    return {
      preparacion: "gruñe bajando las orejas y mostrando los colmillos con instinto de manada",
      ataque: "se abalanza corriendo para morder las extremidades del oponente",
      defensa: "da un ágil salto lateral esquivando el ataque con reflejos caninos",
      contra: "lanza un rápido tarascón intentando desgarrar carne",
      remate: "clava sus colmillos profundamente y sacude su cabeza con brutalidad"
    };
  }
  // 3. SERPIENTES
  if (t.match(/(serpiente|cobra|víbora|pitón|boa|anaconda|mamba)/)) {
    return {
      preparacion: "sisea amenazadoramente mientras levanta la cabeza del suelo",
      ataque: "lanza una mordida ultrarrápida como si fuera un látigo",
      defensa: "se desliza por el suelo serpenteando para esquivar el impacto",
      contra: "se lanza hacia adelante mostrando sus colmillos venenosos",
      remate: "se enrosca alrededor de su rival, comprimiendo hasta romper sus huesos"
    };
  }
  // 4. REPTILES GRANDES / ANFIBIOS
  if (t.match(/(cocodrilo|caimán|iguana|camaleón|dragón de komodo|rana|sapo|tortuga|ajolote|t-rex|velociraptor)/)) {
    return {
      preparacion: "abre sus fauces en señal de amenaza y se planta firme",
      ataque: "da un poderoso coletazo buscando derribar a su presa",
      defensa: "usa su dura piel escamosa para bloquear el daño casi por completo",
      contra: "atrapa una extremidad del rival con sus potentes mandíbulas",
      remate: "muerde profundamente y realiza un devastador giro de la muerte"
    };
  }
  // 5. AVES RAPACES
  if (t.match(/(águila|halcón|cóndor|cuervo|búho|lechuza|carpintero|pelícano)/)) {
    return {
      preparacion: "extiende sus enormes alas y lanza un chillido ensordecedor",
      ataque: "cae en picada desde el aire a una velocidad vertiginosa",
      defensa: "aletea bruscamente cambiando su trayectoria en pleno vuelo",
      contra: "rasga fuertemente con sus garras cayendo desde las alturas",
      remate: "golpea directo en el punto ciego con el pico para un daño crítico"
    };
  }
  // 6. AVES ACUÁTICAS / CORREDORAS
  if (t.match(/(pato|gallina|loro|paloma|pavo|ganso|codorniz|cisne|gaviota|gorrión|golondrina|flamenco|cigüeña|avestruz|emú|casuario|kiwi|pingüino)/)) {
    return {
      preparacion: "agita sus plumas frenéticamente preparándose para el caos",
      ataque: "ataca corriendo y lanzando picotazos rápidos",
      defensa: "aletea y salta erráticamente confundiendo por completo a su rival",
      contra: "da una fuerte patada o un letal aletazo sorpresa",
      remate: "desata una ráfaga de picotazos veloces que abruman al oponente"
    };
  }
  // 7. MAMÍFEROS PESADOS / HERBÍVOROS GRANDES
  if (t.match(/(oso|elefante|rinoceronte|hipopótamo|jirafa|cebra|camello|alce|ciervo|vaca|caballo|cerdo|oveja|cabra|burro|mamut|triceratops)/)) {
    return {
      preparacion: "bufa violentamente y raspa la tierra con fuerza",
      ataque: "carga a toda velocidad utilizando su inmenso peso corporal",
      defensa: "recibe el golpe de lleno, confiando en su enorme masa muscular",
      contra: "embiste de lado lanzando a su rival violentamente hacia atrás",
      remate: "se alza y aplasta a su oponente bajo su inmenso peso"
    };
  }
  // 8. ROEDORES Y MAMÍFEROS PEQUEÑOS
  if (t.match(/(conejo|hámster|ratón|cobaya|hurón|erizo|perezoso|armadillo|oso hormiguero|castor|nutria|mapache|zorrillo|comadreja|visón|tejón|marmota|ardilla|topo|murciélago)/)) {
    return {
      preparacion: "olfatea el aire rápidamente y adopta una postura escurridiza",
      ataque: "corre a máxima velocidad para morder una zona baja",
      defensa: "usa su tamaño reducido para escabullirse por debajo del ataque",
      contra: "lanza una rápida y dolorosa mordida en una zona desprotegida",
      remate: "trepa rápidamente al rival y muerde un punto vital antes de que reaccione"
    };
  }
  // 9. ACUÁTICOS DEPREDADORES
  if (t.match(/(pez|foca|morsa|manatí|dugongo|delfín|orca|ballena|tiburón|raya|cangrejo|langosta|camarón|calamar|pulpo|estrella|erizo de mar|caballito|medusa|coral|megalodón)/)) {
    return {
      preparacion: "agita el agua a su alrededor preparándose para cazar",
      ataque: "se impulsa como un torpedo para dar un fuerte impacto",
      defensa: "se sumerge rápidamente evadiendo el ataque en su entorno líquido",
      contra: "golpea con brutalidad usando aletas, cola o tenazas",
      remate: "atrapa a su presa y la arrastra en un frenesí de mordiscos y desgarros"
    };
  }
  // 10. MITOLÓGICOS (FUEGO / AIRE)
  if (t.match(/(dragón|fénix|wyvern|qilin|thunderbird|roc)/)) {
    return {
      preparacion: "comienza a emanar un aura mágica e ilumina todo el lugar",
      ataque: "exhala una potente llamarada abrasadora",
      defensa: "usa sus místicas alas y escamas para desviar el poder del golpe",
      contra: "lanza una ráfaga elemental rápida desde las alturas",
      remate: "envuelve a su rival en un apocalíptico tornado de energía"
    };
  }
  // 11. MITOLÓGICOS (TIERRA / FUERZA)
  if (t.match(/(golem|minotauro|cerbero|behemoth|manticora|esfinge|gárgola|yeti|pie grande|wendigo)/)) {
    return {
      preparacion: "hace temblar la tierra con un rugido sobrenatural",
      ataque: "embiste con una fuerza mágica y demoledora",
      defensa: "se planta firme y su piel de roca absorbe casi todo el impacto",
      contra: "lanza un zarpazo o puñetazo que quiebra el propio suelo",
      remate: "desata su ira mitológica aplastando y destruyendo todo a su paso"
    };
  }
  // 12. MITOLÓGICOS (AGUA / SOMBRAS)
  if (t.match(/(kraken|leviatán|unicornio|pegaso|sirena|tritón|kitsune|tengu|kappa|slime|chupacabras)/)) {
    return {
      preparacion: "los ojos le brillan mientras la realidad a su alrededor se distorsiona",
      ataque: "ataca usando magia oscura o poder ancestral puro",
      defensa: "se desvanece temporalmente en sombras/niebla evadiendo el ataque",
      contra: "lanza un hechizo que confunde y daña la mente del rival",
      remate: "atrapa a su oponente con magia, arrastrándolo a la oscuridad eterna"
    };
  }

  // DEFAULT 
  return {
    preparacion: "adopta una postura defensiva pero valiente",
    ataque: "corre velozmente para dar un golpe",
    defensa: "esquiva saltando hacia atrás",
    contra: "da un golpe desesperado pero certero",
    remate: "encuentra un punto débil y no perdona"
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
    
    // SISTEMA DE MUERTE
    if (userData.pet && petCommands.includes(command) && hoursPassed(userData.pet.lastFeed, 72)) {
      const p = userData.pet;
      const txt = `🪦 *Lamentablemente, ${p.name} ha fallecido por abandono.*\n_Has sido vetado de adoptar._`;
      userData.petGraveyard = true; delete userData.pet; await db.setUser(userKey, userData);
      return sock.sendMessage(remoteJid, { text: txt }, { quoted: msg });
    }

    // ADOPTAR
    if (command === 'adoptar') {
      if (userData.pet) return sock.sendMessage(remoteJid, { text: `❌ Ya tienes a *${userData.pet.name}*.` }, { quoted: msg });
      if (userData.petGraveyard) return sock.sendMessage(remoteJid, { text: `💀 Fuiste vetado por dejar morir a tu mascota. Pide perdón al Owner.` }, { quoted: msg });

      const petName = args.join(' ') || 'Sin Nombre';
      const roll = Math.random() * 100;
      let pool = roll <= 5 ? ANIMALES.mitologico : roll <= 15 ? ANIMALES.epico : roll <= 40 ? ANIMALES.raro : ANIMALES.comun;
      const randomType = pool[Math.floor(Math.random() * pool.length)];

      userData.pet = { name: petName, type: randomType, xp: 0, level: 1, lastFeed: now, lastPlay: now, lastTrain: 0, lastWalk: 0, lastBattle: 0 };
      await db.setUser(userKey, userData);
      return sock.sendMessage(remoteJid, { text: `🎉 ¡Ha nacido un *${randomType}*! Lo llamaste *${petName}*.` }, { quoted: msg });
    }

    // PERFIL Y COMANDOS BÁSICOS
    if (command === 'mascota') {
      if (!userData.pet) return sock.sendMessage(remoteJid, { text: `❌ No tienes mascota.` }, { quoted: msg });
      const p = userData.pet;
      const stage = p.level >= NIVEL_EVOLUCION ? 'Adulto 🔥' : 'Bebé 🐾';
      let estado = hoursPassed(p.lastFeed, 24) ? '🤒 Herido/Enfermo' : hoursPassed(p.lastFeed, 12) ? '💢 Hambriento' : '✅ Sano y Fuerte';
      return sock.sendMessage(remoteJid, { text: `🐾 *PERFIL: ${p.name}*\n🧬 ADN: *${p.type}*\n📊 Nivel: *${p.level}* (${stage})\n✨ XP: *${p.xp}*\n💭 Estado: ${estado}` }, { quoted: msg });
    }

    if (!userData.pet && petCommands.includes(command)) return sock.sendMessage(remoteJid, { text: `❌ No tienes criatura alguna.` }, { quoted: msg });
    const p = userData.pet;

    const procesarAccion = async (gainXP, actionText, isHeal = false) => {
      if (!isHeal && hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `🚑 *${p.name}* está demasiado herido. Usa *.curar*.` }, { quoted: msg });
      p.xp += gainXP;
      if (Math.floor(p.xp / 200) + 1 > p.level) p.level = Math.floor(p.xp / 200) + 1;
      await db.setUser(userKey, userData);
      return sock.sendMessage(remoteJid, { text: `${actionText}\n⭐ Ganó *+${gainXP} XP*.` }, { quoted: msg });
    };

    if (command === 'alimentar') {
      if ((2 * 60 * 60 * 1000) - (now - (p.lastFeed || 0)) > 0 && !hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* está lleno.` }, { quoted: msg });
      p.lastFeed = now; return procesarAccion(30, `🍖 Alimentaste a *${p.name}*.`);
    }
    if (command === 'jugar') {
      if ((30 * 60 * 1000) - (now - (p.lastPlay || 0)) > 0) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* está cansado.` }, { quoted: msg });
      p.lastPlay = now; return procesarAccion(15, `🎾 Jugaste con *${p.name}*.`);
    }
    if (command === 'entrenar') {
      if ((4 * 60 * 60 * 1000) - (now - (p.lastTrain || 0)) > 0) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* necesita descansar.` }, { quoted: msg });
      p.lastTrain = now; return procesarAccion(60, `⚔️ Entrenaste el ADN de *${p.name}*.`);
    }
    if (command === 'pasear') {
      p.lastWalk = now; return procesarAccion(20, `🌳 Paseaste con *${p.name}*.`);
    }
    if (command === 'curar') {
      if (!hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `✅ *${p.name}* está sano.` }, { quoted: msg });
      p.lastFeed = now - (23 * 60 * 60 * 1000); return procesarAccion(5, `💊 Trataste a *${p.name}*. ¡Está a salvo!`, true);
    }
    if (command === 'dormir') {
      return sock.sendMessage(remoteJid, { text: `💤 *${p.name}* duerme profundamente...` }, { quoted: msg });
    }

    // ⚔️ SISTEMA DE COMBATE (6 FASES + RESUMEN)
    if (command === 'pelear') {
      const target = getTarget(msg, args);
      if (!target) return sock.sendMessage(remoteJid, { text: `❌ Menciona a tu rival.` }, { quoted: msg });
      if (target === userKey) return sock.sendMessage(remoteJid, { text: `❌ No puedes pelear contra ti mismo.` }, { quoted: msg });

      const targetData = await db.getUser(target);
      if (!targetData.pet) return sock.sendMessage(remoteJid, { text: `❌ Ese usuario no tiene mascota.` }, { quoted: msg });
      const enemyPet = targetData.pet;
      
      if (hoursPassed(p.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `🚑 *${p.name}* está muy herido. Usa *.curar*.` }, { quoted: msg });
      if (hoursPassed(enemyPet.lastFeed, 24)) return sock.sendMessage(remoteJid, { text: `🛑 El rival está herido. Es cobarde atacar ahora.` }, { quoted: msg });
      
      const cooldown = (60 * 60 * 1000) - (now - (p.lastBattle || 0));
      if (cooldown > 0 && !isOwner && !userData.premium) return sock.sendMessage(remoteJid, { text: `⏳ *${p.name}* descansa. Espera *${Math.floor(cooldown / 60000)} min*.` }, { quoted: msg });
      p.lastBattle = now;

      // --- CÁLCULO DE PODER Y MILAGROS ---
      const miPoder = p.level * getRarezaMascota(p.type) * (p.level >= NIVEL_EVOLUCION ? 1.5 : 1.0);
      const rivalPoder = enemyPet.level * getRarezaMascota(enemyPet.type) * (enemyPet.level >= NIVEL_EVOLUCION ? 1.5 : 1.0);
      const difNiveles = p.level - enemyPet.level;
      let probGanar = 50;

      if (Math.abs(difNiveles) < 3) {
        probGanar = (miPoder / (miPoder + rivalPoder)) * 100;
        probGanar = Math.min(Math.max(probGanar, 30), 70); // Justicia en mismos niveles
      } else {
        probGanar = difNiveles > 0 ? 88 : 12; // Si eres 3+ niveles menor, solo 12% de ganar
      }

      const ganeYo = (Math.random() * 100) <= probGanar;
      const esMilagro = (difNiveles <= -3 && ganeYo) || (difNiveles >= 3 && !ganeYo);
      const xpBatalla = Math.floor(Math.random() * 60) + 60; 
      
      const ADN_Mio = obtenerADN(p.type);
      const ADN_Rival = obtenerADN(enemyPet.type);

      // ⏱️ TIEMPO DE CADA EDICIÓN: 10 SEGUNDOS
      const T_ESPERA = 10000; 

      // ---------------------------------------------------------
      // MENSAJE 0: PRESENTACIÓN
      let texto = `⚔️ *B A T A L L A  D E  S A N G R E* ⚔️\n\n`;
      texto += `🥊 *${p.name}* (${p.type} Nvl ${p.level})\n`;
      texto += `🆚 *${enemyPet.name}* (${enemyPet.type} Nvl ${enemyPet.level})\n\n`;
      texto += `_La arena está lista. Los combatientes ingresan._`;
      const msgBatalla = await sock.sendMessage(remoteJid, { text: texto, mentions: [target] }, { quoted: msg });
      await delay(T_ESPERA);

      // EDICIÓN 1: Tensión y Preparación
      texto = `⚔️ *B A T A L L A  D E  S A N G R E* ⚔️\n\n👀 *FASE 1: TENSIÓN*\n\n`;
      texto += `*${p.name}* ${ADN_Mio.preparacion}.\n\n`;
      texto += `Frente a él, *${enemyPet.name}* ${ADN_Rival.preparacion}. El ambiente es asfixiante.`;
      await sock.sendMessage(remoteJid, { text: texto, edit: msgBatalla.key, mentions: [target] });
      await delay(T_ESPERA);

      // EDICIÓN 2: El Primer Ataque
      texto += `\n\n💥 *FASE 2: EL ATAQUE*\n\n`;
      texto += `Sin previo aviso, *${p.name}* ${ADN_Mio.ataque}! Va directo a matar.`;
      await sock.sendMessage(remoteJid, { text: texto, edit: msgBatalla.key, mentions: [target] });
      await delay(T_ESPERA);

      // EDICIÓN 3: La Defensa Biológica
      texto += `\n\n🛡️ *FASE 3: LA DEFENSA*\n\n`;
      if (ganeYo) {
        texto += `*${enemyPet.name}* intenta reaccionar, pero el impacto es demasiado rápido y recibe daño crítico.`;
      } else {
        texto += `¡Pero *${enemyPet.name}* ${ADN_Rival.defensa}! El ataque falla por completo.`;
      }
      await sock.sendMessage(remoteJid, { text: texto, edit: msgBatalla.key, mentions: [target] });
      await delay(T_ESPERA);

      // EDICIÓN 4: El Contraataque
      texto += `\n\n⚡ *FASE 4: CONTRAATAQUE*\n\n`;
      if (ganeYo) {
        texto += `Adolorido, *${enemyPet.name}* ${ADN_Rival.contra}, pero *${p.name}* ya estaba preparado para bloquear.`;
      } else {
        texto += `Aprovechando su evasión perfecta, *${enemyPet.name}* ${ADN_Rival.contra}, dejando a su oponente expuesto.`;
      }
      await sock.sendMessage(remoteJid, { text: texto, edit: msgBatalla.key, mentions: [target] });
      await delay(T_ESPERA);

      // EDICIÓN 5: El Clímax
      texto += `\n\n🔥 *FASE 5: CLÍMAX MORTAL*\n\n`;
      if (ganeYo) {
        texto += `Ambos se miran jadeando. ¡*${p.name}* carga su energía restante y ${ADN_Mio.remate}!`;
      } else {
        texto += `Ambos se miran jadeando. ¡*${enemyPet.name}* domina la situación y ${ADN_Rival.remate}!`;
      }
      await sock.sendMessage(remoteJid, { text: texto, edit: msgBatalla.key, mentions: [target] });
      await delay(T_ESPERA);

      // EDICIÓN 6: Resolución Final de la Historia
      texto += `\n\n💨 *FASE 6: EL HUMO SE DISIPA...*\n\n`;
      if (ganeYo) {
        texto += `El cuerpo de *${enemyPet.name}* cae al suelo gravemente herido. ¡*${p.name}* suelta un grito de victoria!`;
      } else {
        texto += `El cuerpo de *${p.name}* cae al suelo gravemente herido. ¡*${enemyPet.name}* es superior!`;
      }
      await sock.sendMessage(remoteJid, { text: texto, edit: msgBatalla.key, mentions: [target] });
      
      // ---------------------------------------------------------
      // MENSAJE FINAL: RESUMEN INDEPENDIENTE
      await delay(3000); // Pequeña pausa antes de dar los resultados

      let txtResumen = `📜 *RESUMEN OFICIAL DE LA BATALLA* 📜\n\n`;
      if (esMilagro) txtResumen += `🌟 *¡MILAGRO DE LA NATURALEZA!* El de nivel bajo superó las probabilidades (12%).\n\n`;

      if (ganeYo) {
        txtResumen += `🏆 *GANADOR:* ${p.name} (+${xpBatalla} XP)\n`;
        txtResumen += `🩸 *PERDEDOR:* ${enemyPet.name} (Gravemente Herido. Requiere .curar)\n`;
        p.xp += xpBatalla;
        enemyPet.lastFeed = now - (25 * 60 * 60 * 1000); // Castigo al rival
      } else {
        txtResumen += `🏆 *GANADOR:* ${enemyPet.name} (+${xpBatalla} XP)\n`;
        txtResumen += `🩸 *PERDEDOR:* ${p.name} (Gravemente Herido. Requiere .curar)\n`;
        enemyPet.xp += xpBatalla;
        p.lastFeed = now - (25 * 60 * 60 * 1000); // Castigo para ti
      }

      // Check subida de nivel
      if (Math.floor(p.xp / 200) + 1 > p.level) {
        p.level = Math.floor(p.xp / 200) + 1;
        txtResumen += `\n✨ *${p.name}* ha subido al Nivel ${p.level}!`;
      }
      if (Math.floor(enemyPet.xp / 200) + 1 > enemyPet.level) {
        enemyPet.level = Math.floor(enemyPet.xp / 200) + 1;
      }

      await db.setUser(userKey, userData);
      await db.setUser(target, targetData);

      return sock.sendMessage(remoteJid, { text: txtResumen, mentions: [target] });
    }

    // SACRIFICAR / PERDONAR
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
