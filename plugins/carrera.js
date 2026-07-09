'use strict';

// Guardamos las carreras activas en memoria
const carreras = {};
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Catálogo de corredores salvajes
const ANIMALES = ['🐎', '🐢', '🐖', '🐕', '🐅', '🐉', '🦖', '🦘', '🦏', '🦍', '🐆', '🐏'];
const PISTAS = ['─', '═']; 

// Frases de relleno para mantener la altura del mensaje
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

            let msgInicial = `🏁 *¡SE ABRE LA PISTA!* 🏁\n\n`;
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
            "𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 🙄 ¿En serio nadie más se unió? Qué grupo tan aburrido... Supongo que tendré que bajar de mi nube de código para humillarte yo mismo. ¡Prepárate para llorar! 💅",
            "𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 🤖 Al parecer a nadie le sobra el valor (o el XP) aquí. Me toca ensuciarme las manos... Jugar contra mí es perder tu tiempo, pero dale, ¡arranca! 🏎️💨",
            "𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 🥱 Pff, te dejaron más solo que al admin en San Valentín. Ni modo, yo mismo te voy a dar una paliza en la pista. ¡Ve despidiéndote de tu dinero! 💸",
            "𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 🤖 ¿Nadie? Ok, veo que en este grupo hay puro miedoso. Calentando motores... Te voy a demostrar por qué soy el mejor bot de WhatsApp. 😎🏁",
            "𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 🤣 Me da pena verte compitiendo solo. Entraré a la pista nomás para que sientas la presión de competir contra la máquina perfecta. ⚙️",
            "𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 👑 Ya que nadie se atreve, el rey de este grupo (o sea, yo) te va a dar una lección de humildad. ¡Acelera si puedes!"
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
        let textoFrame = `🏁 *CARRERA EXTREMA* 🏁\n\n`;
        textoFrame += carrera.apuesta > 0 ? `💰 Pozo: *${pozoTotal} XP*\n\n` : `🎮 Amistosa\n\n`;

        let eventosTexto = []; 
        
        // Buscamos quién va ganando para activar la "remontada épica" a los que van perdiendo
        let maxPosicionActual = Math.max(...carrera.participantes.map(c => c.posicion));

        for (let corredor of carrera.participantes) {
            // Avance base ampliado (de 1 a 3 espacios)
            let avance = Math.floor(Math.random() * 3) + 1; 
            
            let chance = Math.random();
            let atrasado = (maxPosicionActual - corredor.posicion) >= 3; // ¿Va perdiendo por 3 espacios o más?

            // Si está muy atrás, manipulamos su suerte para que alcance al resto
            if (atrasado) chance -= 0.15; 

            if (chance < 0.12) { 
                avance += 3; // Súper atajo salvaje
                eventosTexto.push(`🚀 ¡INCREÍBLE! El ${corredor.animal} tomó un atajo y voló en la pista.`);
            } else if (chance < 0.28) { 
                avance += 2; // Turbo fuerte
                eventosTexto.push(`⚡ ¡El ${corredor.animal} pisó el acelerador a fondo!`);
            } else if (chance > 0.88 && corredor.posicion > 0 && !atrasado) { 
                // Los que van ganando tienen más chance de tropezar y perder el ritmo
                avance = Math.max(0, avance - 2); 
                eventosTexto.push(`💥 ¡Oh no! El ${corredor.animal} tropezó y perdió su ventaja.`);
            }

            corredor.posicion += avance;
            if (corredor.posicion >= carrera.longitudPista) {
                hayGanador = true;
            }

            let posVisual = Math.min(corredor.posicion, carrera.longitudPista);
            let espaciosAdelante = Math.max(0, carrera.longitudPista - posVisual);
            let espaciosAtras = Math.max(0, posVisual);
            
            let pistaAdelante = p.repeat(espaciosAdelante);
            let pistaAtras = p.repeat(espaciosAtras);
            
            let tagNombre = corredor.id === 'bot' ? '𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕' : `@${number(corredor.id)}`;
            
            textoFrame += `🏁 |${pistaAdelante}${corredor.animal}${pistaAtras}|\n`;
            textoFrame += ` ↳ ${corredor.animal} ${tagNombre}\n\n`; 
        }

        if (eventosTexto.length === 0) {
            eventosTexto.push(NARRADOR_IDLE[Math.floor(Math.random() * NARRADOR_IDLE.length)]);
        }

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
    let maxPosicion = Math.max(...carrera.participantes.map(c => c.posicion));
    let ganadores = carrera.participantes.filter(c => c.posicion === maxPosicion && c.posicion >= carrera.longitudPista);

    let textoFinal = "🏆 *¡CRUZARON LA META!*\n\n";

    if (carrera.apuesta > 0) {
        let premioPorGanador = Math.floor(pozoTotal / ganadores.length);

        if (ganadores.some(g => g.id === 'bot')) {
            const botGanaApuestas = [
                `𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 🤖 ¡Se los dije! Los aplasté a todos y me llevo los *${pozoTotal} XP*. Vayan a llorar a su cuarto. 💅✨`,
                `𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 🤑 ¡Dinero fácil! Gracias por regalarme sus *${pozoTotal} XP*. El casino siempre gana, novatos.`,
                `𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 🥱 ¿Eso fue todo? Ni siquiera tuve que usar el 1% de mi CPU. Me quedo con sus *${pozoTotal} XP*. ¡Suerte para la próxima!`,
                `𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 🏎️💨 ¡Tráguense mi polvo! Yo soy la ley aquí. Disfrutaré mucho gastando estos *${pozoTotal} XP*.`
            ];
            textoFinal += botGanaApuestas[Math.floor(Math.random() * botGanaApuestas.length)];
        } else {
            let tagsGanadores = ganadores.map(g => `@${number(g.id)}`).join(', ');
            textoFinal += `🎉 ¡Victoria para ${tagsGanadores}!\n💰 Has ganado *${premioPorGanador} XP*.`;
            
            for (let g of ganadores) {
                if (g.id !== 'bot') await db.addXP(g.userKey, premioPorGanador);
            }
        }
    } else {
        if (ganadores.some(g => g.id === 'bot')) {
            const botGanaAmistosas = [
                "𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 🤖 ¡Qué aburrido jugar contra ustedes! La gloria es toda mía. 😎",
                "𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 👑 Yo no compito, yo domino. Otra victoria fácil para la máquina.",
                "𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 🤣 ¿En serio pensaron que una bolsa de carne me iba a ganar? ¡Soy imparable!",
                "𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 🏆 Primer lugar indiscutible. Deberían pagarme solo por ver cómo corro."
            ];
            textoFinal += botGanaAmistosas[Math.floor(Math.random() * botGanaAmistosas.length)];
        } else {
            let tagsGanadores = ganadores.map(g => `@${number(g.id)}`).join(', ');
            textoFinal += `🎉 ¡La gloria es para ${tagsGanadores}!`;
        }
    }

    let mencionesGanadores = ganadores.filter(g => g.id !== 'bot').map(g => g.id);
    await sock.sendMessage(remoteJid, { text: textoFinal, mentions: mencionesGanadores });
    
    delete carreras[remoteJid];
}
