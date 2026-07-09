'use strict';

// Guardamos las carreras activas en memoria
const carreras = {};
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Catálogo de corredores salvajes
const ANIMALES = ['🐎', '🐢', '🐖', '🐕', '🐅', '🐉', '🦖', '🦘', '🦏', '🦍', '🐆', '🐏'];
const PISTAS = ['─', '═']; // Usamos solo estas dos líneas porque en Android no deforman el texto

// Frases de relleno para mantener la altura del mensaje estática
const NARRADOR_IDLE = [
    "👀 El público observa con muchísima tensión...",
    "🔥 La pista está que arde, nadie quiere ceder.",
    "👟 Los corredores mantienen un ritmo constante...",
    "💨 ¡Qué velocidad la de estas bestias!",
    "📸 Se preparan para un final de fotografía..."
];

function cleanJid(jid = '') {
    return String(jid).split(':')[0];
}

function number(jid = '') {
    return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

function getAnimalAleatorio(usados) {
    let disponibles = ANIMALES.filter(a => !usados.includes(a));
    if (disponibles.length === 0) disponibles = ANIMALES; 
    return disponibles[Math.floor(Math.random() * disponibles.length)];
}

module.exports = {
    commands: ['carrera', 'unirse', 'arrancar'],
    execute: async ({ sock, remoteJid, sender, pushName, args, command, db, reply, fromGroup }) => {
        
        if (!fromGroup) {
            return reply('❌ Este comando solo funciona en grupos.');
        }

        const userKey = cleanJid(sender);
        const userData = await db.getUser(userKey);

        // ==========================================
        // COMANDO: .carrera
        // ==========================================
        if (command === 'carrera') {
            if (carreras[remoteJid]) {
                return reply('⚠️ Ya hay una carrera organizándose o corriendo en este grupo.');
            }

            let apuesta = 0;

            if (args[0]) {
                apuesta = parseInt(args[0]);
                
                if (isNaN(apuesta) || apuesta <= 0) {
                    return reply('🏁 Ingresa una cantidad válida.\n\nEjemplos:\n*.carrera* (Diversión)\n*.carrera 500* (Apostar 500 XP)');
                }
                if ((userData.xp || 0) < apuesta) {
                    return reply(`❌ No tienes suficiente XP. Tu saldo: *${userData.xp || 0}*`);
                }
                await db.removeXP(userKey, apuesta);
            }

            const miAnimal = getAnimalAleatorio([]);
            const estiloPista = PISTAS[Math.floor(Math.random() * PISTAS.length)];

            // Pista fijada en 20 de longitud
            carreras[remoteJid] = {
                estado: 'esperando',
                creador: userKey,
                apuesta: apuesta,
                estiloPista: estiloPista,
                animalesUsados: [miAnimal],
                participantes: [{ id: cleanJid(sender), userKey: userKey, animal: miAnimal, posicion: 0 }],
                longitudPista: 20, 
                timeoutId: null
            };

            let msgInicial = `🏁 *¡SE ABRE LA PISTA!* 🏁\n`;
            msgInicial += `──────────────────────────────\n`;
            if (apuesta > 0) msgInicial += `💰 Apuesta fijada: *${apuesta} XP*\n\n`;
            else msgInicial += `🎮 *Carrera amistosa* (Sin apuestas)\n\n`;
            
            msgInicial += `Tu corredor será el: ${miAnimal}\n\n`;
            msgInicial += `Escriban *.unirse* para entrar.\n_(El creador puede escribir *.arrancar* para iniciar ya)_`;

            reply(msgInicial);

            carreras[remoteJid].timeoutId = setTimeout(async () => {
                iniciarCarrera(sock, remoteJid, db);
            }, 90000);
        }

        // ==========================================
        // COMANDO: .unirse
        // ==========================================
        if (command === 'unirse') {
            let carrera = carreras[remoteJid];
            
            if (!carrera || carrera.estado !== 'esperando') {
                return reply('⚠️ No hay ninguna carrera en fase de inscripción.');
            }
            if (carrera.participantes.find(p => p.id === cleanJid(sender))) {
                return reply('⚠️ Ya estás inscrito.');
            }

            if (carrera.apuesta > 0) {
                if ((userData.xp || 0) < carrera.apuesta) {
                    return reply(`❌ No tienes *${carrera.apuesta} XP* para igualar la apuesta.`);
                }
                await db.removeXP(userKey, carrera.apuesta);
            }

            const nuevoAnimal = getAnimalAleatorio(carrera.animalesUsados);
            carrera.animalesUsados.push(nuevoAnimal);
            carrera.participantes.push({ id: cleanJid(sender), userKey: userKey, animal: nuevoAnimal, posicion: 0 });

            await sock.sendMessage(remoteJid, {
                text: `${nuevoAnimal} @${number(sender)} ha entrado a la pista!`,
                mentions: [cleanJid(sender)]
            });
        }

        // ==========================================
        // COMANDO: .arrancar (Solo creador)
        // ==========================================
        if (command === 'arrancar') {
            let carrera = carreras[remoteJid];
            
            if (!carrera || carrera.estado !== 'esperando') {
                return reply('⚠️ No hay carreras pendientes de inicio.');
            }
            if (carrera.creador !== userKey) {
                return reply('❌ Solo el que creó la carrera puede arrancarla antes de tiempo.');
            }

            clearTimeout(carrera.timeoutId);
            iniciarCarrera(sock, remoteJid, db);
        }
    }
};

// ==========================================
// LÓGICA DE INICIO Y PERSONALIDAD DEL BOT
// ==========================================
async function iniciarCarrera(sock, remoteJid, db) {
    let carrera = carreras[remoteJid];
    if (!carrera || carrera.estado !== 'esperando') return;

    if (carrera.participantes.length === 1) {
        const frasesToxicas = [
            "🙄 ¿En serio nadie más se unió? Qué grupo tan aburrido... Supongo que tendré que bajar de mi nube de código para humillarte yo mismo. ¡Prepárate para llorar! 💅",
            "🤖 Al parecer a nadie le sobra el valor (o el XP) aquí. Me toca ensuciarme las manos... Jugar contra mí es perder tu tiempo, pero dale, ¡arranca! 🏎️💨",
            "🥱 Pff, te dejaron más solo que al admin en San Valentín. Ni modo, yo mismo te voy a dar una paliza en la pista. ¡Ve despidiéndote de tu dinero! 💸",
            "🤖 ¿Nadie? Ok, veo que en este grupo hay puro miedoso. Calentando motores... Te voy a demostrar por qué soy el mejor bot de WhatsApp. 😎🏁"
        ];
        
        const fraseElegida = frasesToxicas[Math.floor(Math.random() * frasesToxicas.length)];
        await sock.sendMessage(remoteJid, { text: fraseElegida });
        
        const animalBot = getAnimalAleatorio(carrera.animalesUsados);
        carrera.participantes.push({ id: 'bot', userKey: 'bot', animal: animalBot, posicion: 0 });
        await esperar(3000); 
    } else {
        await sock.sendMessage(remoteJid, { text: "🏁 ¡CERRANDO INSCRIPCIONES! Que empiece el caos..." });
        await esperar(1500);
    }

    carrera.estado = 'corriendo';
    await animarCarrera(sock, remoteJid, db);
}

// ==========================================
// MOTOR DE ANIMACIÓN Y RESULTADOS
// ==========================================
async function animarCarrera(sock, remoteJid, db) {
    let carrera = carreras[remoteJid];
    let hayGanador = false;
    let mensajeId = null;
    const p = carrera.estiloPista; 

    let pozoTotal = carrera.apuesta * carrera.participantes.length;
    let arrayMenciones = carrera.participantes.filter(p => p.id !== 'bot').map(p => p.id);

    while (!hayGanador) {
        let textoFrame = `🏁 *CARRERA EXTREMA* 🏁\n`;
        textoFrame += `──────────────────────────────\n`; 
        textoFrame += carrera.apuesta > 0 ? `💰 Pozo: *${pozoTotal} XP*\n\n` : `🎮 Amistosa\n\n`;

        let eventosTexto = []; 

        for (let corredor of carrera.participantes) {
            let avance = Math.floor(Math.random() * 2) + 1; 
            
            let chance = Math.random();
            if (chance < 0.12) { 
                avance += 2; 
                eventosTexto.push(`🚀 ¡Imparable! El ${corredor.animal} encontró un atajo.`);
            } else if (chance < 0.25) { 
                avance += 1; 
                eventosTexto.push(`⚡ ¡El ${corredor.animal} se tomó un RedBull y aceleró!`);
            } else if (chance > 0.90 && corredor.posicion > 0) { 
                avance -= 1; 
                eventosTexto.push(`💥 El ${corredor.animal} tropezó un poco, pero no se rinde.`);
            }

            corredor.posicion += avance;
            if (corredor.posicion >= carrera.longitudPista) {
                corredor.posicion = carrera.longitudPista;
                hayGanador = true;
            }

            let espaciosAdelante = Math.max(0, carrera.longitudPista - corredor.posicion);
            let espaciosAtras = Math.max(0, corredor.posicion);
            
            let pistaAdelante = p.repeat(espaciosAdelante);
            let pistaAtras = p.repeat(espaciosAtras);
            
            let tagNombre = corredor.id === 'bot' ? 'SiriusBot' : `@${number(corredor.id)}`;
            
            // 🔥 Banderas rojas eliminadas aquí 🔥
            textoFrame += `🏁 |${pistaAdelante}${corredor.animal}${pistaAtras}|\n`;
            textoFrame += ` ↳ ${corredor.animal} ${tagNombre}\n\n`; 
        }

        if (eventosTexto.length === 0) {
            eventosTexto.push(NARRADOR_IDLE[Math.floor(Math.random() * NARRADOR_IDLE.length)]);
        }

        textoFrame += `──────────────────────────────\n`;
        textoFrame += `📢 *Narrador:*\n${eventosTexto.join('\n')}`;

        if (!mensajeId) {
            let msg = await sock.sendMessage(remoteJid, { text: textoFrame, mentions: arrayMenciones });
            mensajeId = msg.key;
        } else {
            try {
                await sock.sendMessage(remoteJid, { text: textoFrame, edit: mensajeId, mentions: arrayMenciones });
            } catch (err) {} 
        }

        await esperar(3200); 
    }

    // ==========================================
    // CIERRE Y PREMIACIÓN
    // ==========================================
    let ganadores = carrera.participantes.filter(c => c.posicion >= carrera.longitudPista);
    let textoFinal = "🏆 *¡CRUZARON LA META!*\n──────────────────────────────\n\n";

    if (carrera.apuesta > 0) {
        let premioPorGanador = Math.floor(pozoTotal / ganadores.length);

        if (ganadores.some(g => g.id === 'bot')) {
            textoFinal += `🤖 ¡Se los dije! SiriusBot los aplastó a todos y se lleva los *${pozoTotal} XP*. Vayan a llorar a su cuarto. 💅✨`;
        } else {
            let tagsGanadores = ganadores.map(g => `@${number(g.id)}`).join(', ');
            textoFinal += `🎉 ¡Victoria para ${tagsGanadores}!\n💰 Has ganado *${premioPorGanador} XP*.`;
            
            for (let g of ganadores) {
                if (g.id !== 'bot') await db.addXP(g.userKey, premioPorGanador);
            }
        }
    } else {
        if (ganadores.some(g => g.id === 'bot')) {
            textoFinal += `🤖 ¡Qué aburrido jugar contra ustedes! La gloria es toda mía. 😎`;
        } else {
            let tagsGanadores = ganadores.map(g => `@${number(g.id)}`).join(', ');
            textoFinal += `🎉 ¡La gloria es para ${tagsGanadores}!`;
        }
    }

    let mencionesGanadores = ganadores.filter(g => g.id !== 'bot').map(g => g.id);
    await sock.sendMessage(remoteJid, { text: textoFinal, mentions: mencionesGanadores });
    
    delete carreras[remoteJid];
}
