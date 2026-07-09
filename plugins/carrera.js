'use strict';

// Guardamos las carreras activas en memoria
const carreras = {};
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Catálogo de corredores (todos miran hacia la izquierda por defecto)
const ANIMALES = ['🐎', '🐢', '🐖', '🐕', '🐅', '🐉', '🦖', '🦘', '🦏', '🦍', '🐆', '🐏'];
const PISTAS = ['─', '═', '≈', '〰']; // Diferentes terrenos visuales

function cleanJid(jid = '') {
    return String(jid).split(':')[0];
}

function number(jid = '') {
    return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

function getAnimalAleatorio(usados) {
    let disponibles = ANIMALES.filter(a => !usados.includes(a));
    if (disponibles.length === 0) disponibles = ANIMALES; // Por si juegan más de 12 personas
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

            // Registramos la carrera con el creador
            carreras[remoteJid] = {
                estado: 'esperando',
                creador: userKey,
                apuesta: apuesta,
                estiloPista: estiloPista,
                animalesUsados: [miAnimal],
                participantes: [{ id: cleanJid(sender), userKey: userKey, animal: miAnimal, posicion: 0 }],
                longitudPista: 15, // Pista un poco más larga para dar tiempo a los eventos
                timeoutId: null
            };

            let msgInicial = `🏁 *¡SE ABRE LA PISTA!* 🏁\n\n`;
            if (apuesta > 0) msgInicial += `💰 Apuesta fijada: *${apuesta} XP*\n\n`;
            else msgInicial += `🎮 *Carrera amistosa* (Sin apuestas)\n\n`;
            
            msgInicial += `Tu corredor será el: ${miAnimal}\n\n`;
            msgInicial += `Escriban *.unirse* para entrar.\n_(El creador puede escribir *.arrancar* para iniciar ya)_`;

            reply(msgInicial);

            // Temporizador de 90 segundos
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

            // Cancelamos el temporizador automático y forzamos el inicio
            clearTimeout(carrera.timeoutId);
            iniciarCarrera(sock, remoteJid, db);
        }
    }
};

// ==========================================
// LÓGICA DE INICIO
// ==========================================
async function iniciarCarrera(sock, remoteJid, db) {
    let carrera = carreras[remoteJid];
    if (!carrera || carrera.estado !== 'esperando') return;

    if (carrera.participantes.length === 1) {
        await sock.sendMessage(remoteJid, { text: "🤖 SiriusBot no encontró rivales.\n\nEl 🐉 entrará a la pista para competir contigo." });
        const animalBot = getAnimalAleatorio(carrera.animalesUsados);
        carrera.participantes.push({ id: 'bot', userKey: 'bot', animal: animalBot, posicion: 0 });
        await esperar(2000);
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
        let textoFrame = `🏁 *CARRERA EXTREMA*\n`;
        textoFrame += carrera.apuesta > 0 ? `💰 Pozo: *${pozoTotal} XP*\n\n` : `🎮 Amistosa\n\n`;

        let eventosTexto = []; 

        for (let corredor of carrera.participantes) {
            let avance = Math.floor(Math.random() * 2) + 1;
            
            // 🎲 EVENTOS ALEATORIOS
            let chance = Math.random();
            if (chance < 0.10) { 
                avance += 2; // Turbo
                eventosTexto.push(`⚡ ¡El ${corredor.animal} activó su turbo!`);
            } else if (chance > 0.90 && corredor.posicion > 0) { 
                avance = -1; // Tropiezo
                eventosTexto.push(`💥 ¡Oh no! El ${corredor.animal} se tropezó.`);
            }

            corredor.posicion += avance;
            if (corredor.posicion < 0) corredor.posicion = 0; 
            
            if (corredor.posicion >= carrera.longitudPista) {
                corredor.posicion = carrera.longitudPista;
                hayGanador = true;
            }

            // 🔥 NUEVA DIRECCIÓN DE PISTA: DERECHA A IZQUIERDA 🔥
            // Meta (Izquierda) <--- [Espacios Adelante] --- ANIMAL --- [Espacios Atrás] <--- Salida (Derecha)
            let espaciosAdelante = Math.max(0, carrera.longitudPista - corredor.posicion);
            let espaciosAtras = Math.max(0, corredor.posicion);
            
            let pistaAdelante = p.repeat(espaciosAdelante);
            let pistaAtras = p.repeat(espaciosAtras);
            
            let tagNombre = corredor.id === 'bot' ? 'SiriusBot' : `@${number(corredor.id)}`;
            
            // Se imprime de esta forma: 🏁 |≈≈≈≈≈🐎≈≈≈≈≈≈≈≈| @usuario
            textoFrame += `🏁 |${pistaAdelante}${corredor.animal}${pistaAtras}| 👤 ${tagNombre}\n`;
        }

        if (eventosTexto.length > 0) {
            textoFrame += `\n📢 *Narrador:*\n${eventosTexto.join('\n')}`;
        }

        if (!mensajeId) {
            let msg = await sock.sendMessage(remoteJid, { text: textoFrame, mentions: arrayMenciones });
            mensajeId = msg.key;
        } else {
            try {
                await sock.sendMessage(remoteJid, { text: textoFrame, edit: mensajeId, mentions: arrayMenciones });
            } catch (err) {} 
        }

        await esperar(1600); 
    }

    // ==========================================
    // CIERRE Y PREMIACIÓN
    // ==========================================
    let ganadores = carrera.participantes.filter(c => c.posicion >= carrera.longitudPista);
    let textoFinal = "🏆 *¡CRUZARON LA META!*\n\n";

    if (carrera.apuesta > 0) {
        let premioPorGanador = Math.floor(pozoTotal / ganadores.length);

        if (ganadores.some(g => g.id === 'bot')) {
            textoFinal += `🤖 ¡SiriusBot aplastó a todos y se lleva los *${pozoTotal} XP*! El casino siempre gana.`;
        } else {
            let tagsGanadores = ganadores.map(g => `@${number(g.id)}`).join(', ');
            textoFinal += `🎉 ¡Victoria para ${tagsGanadores}!\n💰 Has ganado *${premioPorGanador} XP*.`;
            
            for (let g of ganadores) {
                if (g.id !== 'bot') await db.addXP(g.userKey, premioPorGanador);
            }
        }
    } else {
        if (ganadores.some(g => g.id === 'bot')) {
            textoFinal += `🤖 ¡La bestia de SiriusBot cruzó la meta primero!`;
        } else {
            let tagsGanadores = ganadores.map(g => `@${number(g.id)}`).join(', ');
            textoFinal += `🎉 ¡La gloria es para ${tagsGanadores}!`;
        }
    }

    let mencionesGanadores = ganadores.filter(g => g.id !== 'bot').map(g => g.id);
    await sock.sendMessage(remoteJid, { text: textoFinal, mentions: mencionesGanadores });
    
    delete carreras[remoteJid];
}
