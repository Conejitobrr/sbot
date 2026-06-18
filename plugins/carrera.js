'use strict';

// Guardamos las carreras activas en memoria
const carreras = {};
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función auxiliar idéntica a la de tu handler para asegurar que la DB lea bien al usuario
function cleanNumber(jid = '') {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

module.exports = {
    commands: ['carrera', 'unirse'],
    execute: async ({ sock, remoteJid, sender, pushName, args, command, db, reply, fromGroup }) => {
        
        if (!fromGroup) {
            return reply('❌ Este comando es más divertido y está diseñado para usarse solo en grupos.');
        }

        const userKey = cleanNumber(sender);
        const userData = await db.getUser(userKey);

        // ==========================================
        // COMANDO: .carrera
        // ==========================================
        if (command === 'carrera') {
            if (carreras[remoteJid]) {
                return reply('⚠️ Ya hay una carrera organizándose o corriendo en este grupo.');
            }

            const apuesta = parseInt(args[0]);
            
            if (!apuesta || isNaN(apuesta) || apuesta <= 0) {
                return reply('🏁 Debes ingresar una cantidad válida de experiencia para apostar.\nEjemplo: *.carrera 500*');
            }

            if (userData.xp < apuesta) {
                return reply(`❌ No tienes suficiente experiencia para iniciar esta carrera.\nTu XP actual es: *${userData.xp}*`);
            }

            // Descontamos la XP inmediatamente usando tu función removeXP
            await db.removeXP(userKey, apuesta);

            // Registramos la carrera
            carreras[remoteJid] = {
                estado: 'esperando',
                apuesta: apuesta,
                // Guardamos el userKey para poder darle el premio después si gana
                participantes: [{ id: sender, userKey: userKey, nombre: pushName || 'Jugador', posicion: 0 }],
                longitudPista: 12
            };

            reply(`🏁 ¡Se ha iniciado una carrera de caballos!\n💰 Apuesta fijada: *${apuesta} XP*\n\n⏳ Tienen 2 minutos para unirse escribiendo *.unirse*`);

            // Temporizador de 2 minutos (120,000 ms)
            setTimeout(async () => {
                let carrera = carreras[remoteJid];
                if (!carrera) return; 

                if (carrera.participantes.length === 1) {
                    await sock.sendMessage(remoteJid, { text: "🤖 SiriusBot no encontró rivales.\n\n🐎 Entraré yo mismo a la carrera.\n\n🏁 ¡Que empiece la competencia!" });
                    carrera.participantes.push({ id: 'bot', userKey: 'bot', nombre: 'SiriusBot', posicion: 0 });
                    await esperar(2000);
                } else {
                    await sock.sendMessage(remoteJid, { text: "🏁 ¡Tiempo de inscripción agotado! Que empiece la competencia." });
                    await esperar(1500);
                }

                carrera.estado = 'corriendo';
                await animarCarrera(sock, remoteJid, db);
                
            }, 120000);
        }

        // ==========================================
        // COMANDO: .unirse
        // ==========================================
        if (command === 'unirse') {
            let carrera = carreras[remoteJid];
            
            if (!carrera || carrera.estado !== 'esperando') {
                return reply('⚠️ No hay ninguna carrera en fase de inscripción ahora mismo.');
            }

            if (carrera.participantes.find(p => p.id === sender)) {
                return reply('⚠️ Ya estás inscrito en esta carrera.');
            }

            if (userData.xp < carrera.apuesta) {
                return reply(`❌ No tienes suficiente XP para igualar la apuesta de *${carrera.apuesta} XP*.\nTu XP actual es: *${userData.xp}*`);
            }

            // Descontar XP al unirse
            await db.removeXP(userKey, carrera.apuesta);
            
            carrera.participantes.push({ id: sender, userKey: userKey, nombre: pushName || 'Jugador', posicion: 0 });
            reply(`🐎 *${pushName}* se ha unido a la carrera igualando la apuesta.`);
        }
    }
};

// ==========================================
// MOTOR DE ANIMACIÓN Y RESULTADOS
// ==========================================
async function animarCarrera(sock, remoteJid, db) {
    let carrera = carreras[remoteJid];
    let hayGanador = false;
    let mensajeId = null;

    let pozoTotal = carrera.apuesta * carrera.participantes.length;

    while (!hayGanador) {
        let textoFrame = `🏁 *CARRERA DE CABALLOS*\n💰 Pozo en juego: *${pozoTotal} XP*\n\n`;

        for (let p of carrera.participantes) {
            p.posicion += Math.floor(Math.random() * 3);
            
            if (p.posicion >= carrera.longitudPista) {
                p.posicion = carrera.longitudPista;
                hayGanador = true;
            }

            let izquierda = carrera.longitudPista - p.posicion;
            let derecha = p.posicion;
            
            textoFrame += `🏁${'─'.repeat(izquierda)}🐎${'─'.repeat(derecha)} @${p.nombre}\n`;
        }

        if (!mensajeId) {
            let msg = await sock.sendMessage(remoteJid, { text: textoFrame });
            mensajeId = msg.key;
        } else {
            try {
                await sock.sendMessage(remoteJid, { text: textoFrame, edit: mensajeId });
            } catch (err) {}
        }

        await esperar(1500); 
    }

    let ganadores = carrera.participantes.filter(p => p.posicion === carrera.longitudPista);
    let premioPorGanador = Math.floor(pozoTotal / ganadores.length);
    let textoFinal = "🏆 *¡LA CARRERA HA TERMINADO!*\n\n";

    if (ganadores.some(g => g.id === 'bot')) {
        textoFinal += `🤖 ¡SiriusBot ha cruzado la meta y se queda con todo el botín de *${pozoTotal} XP*! Suerte para la próxima.`;
    } else {
        let nombresGanadores = ganadores.map(g => g.nombre).join(', ');
        textoFinal += `🎉 ¡Felicidades a *${nombresGanadores}*!\n💰 Has ganado *${premioPorGanador} XP*.`;

        // Entregar la ganancia usando tu función addXP y el userKey limpio
        for (let g of ganadores) {
            if (g.id !== 'bot') {
                await db.addXP(g.userKey, premioPorGanador);
            }
        }
    }

    await sock.sendMessage(remoteJid, { text: textoFinal });
    delete carreras[remoteJid];
}
