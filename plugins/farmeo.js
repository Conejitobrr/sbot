'use strict';

// Función para pausar y crear el efecto de animación
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 🔥 CANDADO ANTI-SPAM (Evita que saturen el bot mientras se reproduce la animación)
const enUso = new Set();

function cleanJid(jid = '') {
    return String(jid).split(':')[0];
}

function number(jid = '') {
    return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randXP(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==========================================
// DICCIONARIOS DE VARIEDAD (PESCA)
// ==========================================
const pescaLegendaria = [
    '🦈 ¡INCREÍBLE! Pescaste un *Megalodón* y lo vendiste en el mercado negro.',
    '🏴‍☠️ ¡Pesca histórica! Enganchaste un *Cofre Pirata* lleno de joyas antiguas.',
    '🧜‍♀️ ¡Wow! Una *Sirena* se enredó en tu red y te pagó con perlas para que la liberes.',
    '🐉 Pescaste al mismísimo *Monstruo del Lago Ness* y los periódicos te pagaron millones.'
];
const pescaEpica = [
    '🐡 ¡Genial! Pescaste un raro *Pez Globo Dorado*.',
    '🐟 ¡Qué fuerza! Lograste sacar un *Atún Aleta Amarilla* gigante.',
    '⚔️ Luchaste por horas y pescaste un enorme *Pez Espada*.',
    '🦑 Pescaste un *Calamar Gigante* que casi hunde tu bote.'
];
const pescaNormal = [
    '🐟 Pescaste un hermoso *Salmón* para la cena.',
    '🐠 Conseguiste una buena *Corvina* fresca.',
    '🐟 Pescaste un *Bonito* de buen tamaño.',
    '🐡 Atrapaste un montón de *Pejerreyes*.',
    '🐟 Sacaste una *Trucha* de río muy apetitosa.',
    '🐠 Pescaste una *Tilapia* promedio.'
];
const pescaBasura = [
    '🥾 Qué asco... Pescaste una *bota vieja y apestosa*.',
    '🛞 Enganchaste una *llanta pinchada* llena de lodo.',
    '🌿 Solo sacaste un montón de *algas enredadas*.',
    '🩲 Pescaste un *calzoncillo mojado* de alguien más... qué asco.',
    '🍾 Enganchaste una *botella de plástico* vacía. Al menos limpiaste el mar.'
];
const pescaCastigo = [
    '🐊 ¡CUIDADO! Un *cocodrilo* salió del agua y te mordió. Pagaste medicinas.',
    '🦈 Un *tiburón* saltó, se comió tu pesca y rompió tu caña carísima.',
    '🌊 Te resbalaste, caíste al agua y *perdiste tu billetera*.',
    '🦅 Un *pelícano gigante* te atacó y se robó lo que habías pescado.',
    '👮‍♂️ La policía marítima te multó por *pescar sin licencia*.'
];

// ==========================================
// DICCIONARIOS DE VARIEDAD (MINERÍA)
// ==========================================
const minaLegendaria = [
    '💎 ¡JACKPOT! Encontraste un gigantesco *Diamante Brillante*.',
    '🛸 ¡Increíble! Picaste un *Meteorito Alienígena* que vale una fortuna.',
    '🟢 Encontraste una *Esmeralda* del tamaño de un melón.',
    '🔴 Picaste la pared y descubriste la mítica *Gema del Infinito*.'
];
const minaEpica = [
    '🥇 ¡Excelente! Rompiste la piedra y sacaste un *Lingote de Oro puro*.',
    '🔮 Encontraste una cueva oculta llena de *Zafiros Azules*.',
    '💎 Extraíste una hermosa *Geoda de Amatista*.',
    '🔥 Encontraste *Magma Cristalizada* súper rara.'
];
const minaNormal = [
    '🪨 Trabajaste duro y recolectaste bastante *Carbón y Hierro*.',
    '🥉 Lograste extraer varios kilos de *Cobre*.',
    '✨ Encontraste polvo de *Redstone* luminoso.',
    '🔵 Extraíste un poco de *Lapislázuli* para encantamientos.',
    '🪨 Picaste un buen rato y sacaste mucha *Piedra y Cuarzo*.'
];
const minaBasura = [
    '🕸️ Picaste en el lugar equivocado. Solo había *telarañas y polvo*.',
    '🦴 Desenterraste unos *huesos viejos* de perro.',
    '🪨 Picaste y picaste pero solo sacaste *grava inútil*.',
    '⛏️ Solo encontraste *tierra mojada* y gusanos.',
    '🦇 Te metiste a una cueva vacía que solo olía a *guano de murciélago*.'
];
const minaCastigo = [
    '💥 ¡DERRUMBE! Un pedazo de techo te cayó en la cabeza. Pagaste el hospital.',
    '🧨 Picaste donde no debías y *explotó un Creeper* en tu cara.',
    '🌋 Resbalaste y *te caíste a un charco de lava*. Perdiste tus cosas.',
    '🐻 Despertaste a un *oso hibernando* en la cueva y tuviste que huir tirando tu dinero.',
    '⛏️ Rompiste tu *pico de diamante* contra una piedra indestructible.'
];

module.exports = {
    commands: ['pescar', 'minar'],
    
    async execute(ctx) {
        const { sock, remoteJid, sender, command, db, reply, fromGroup } = ctx;

        if (!fromGroup) {
            return reply('❌ Estos comandos son más divertidos en grupos.');
        }

        const userKey = cleanJid(sender);

        // 🔥 Si el usuario ya está pescando o minando, ignoramos el comando para evitar spam
        if (enUso.has(userKey)) return;

        const userData = await db.getUser(userKey);
        const now = Date.now();
        const cooldown = 5 * 60 * 1000; // 5 minutos

        // ==========================================
        // COMANDO: .pescar
        // ==========================================
        if (command === 'pescar') {
            const remaining = cooldown - (now - (userData.lastPescar || 0));

            if (remaining > 0) {
                const m = Math.floor(remaining / 60000);
                const s = Math.floor((remaining % 60000) / 1000);
                return reply(`⏳ Tus peces se asustaron. Debes esperar *${m}m ${s}s* para volver a pescar.`);
            }

            // 🔥 Bloqueamos al usuario y guardamos su tiempo ANTES de la animación
            enUso.add(userKey);
            await db.setUser(userKey, { lastPescar: now });

            try {
                // Animación Inicial
                let msg = await sock.sendMessage(remoteJid, { text: `🎣 @${number(sender)} ha lanzado la caña al agua...`, mentions: [userKey] });
                await esperar(1500);
                try { await sock.sendMessage(remoteJid, { text: `🎣 @${number(sender)} siente un fuerte tirón... *¡Algo picó!*`, edit: msg.key, mentions: [userKey] }); } catch (e) {}
                await esperar(2000);

                // Calcular probabilidad
                let rand = Math.random() * 100;
                let premio = 0;
                let resultadoTxt = '';

                if (rand < 5) { 
                    premio = randXP(4000, 6000); // 5% Legendario
                    resultadoTxt = `${pick(pescaLegendaria)}\n💰 Ganaste *${premio} XP*.`;
                } else if (rand < 20) { 
                    premio = randXP(1500, 2500); // 15% Épico
                    resultadoTxt = `${pick(pescaEpica)}\n💰 Ganaste *${premio} XP*.`;
                } else if (rand < 70) { 
                    premio = randXP(400, 1000);  // 50% Normal
                    resultadoTxt = `${pick(pescaNormal)}\n💰 Ganaste *${premio} XP*.`;
                } else if (rand < 90) { 
                    premio = 0;                  // 20% Basura
                    resultadoTxt = `${pick(pescaBasura)}\n💸 No ganas nada de XP.`;
                } else { 
                    let castigo = randXP(500, 1000); // 10% Mala suerte
                    if ((userData.xp || 0) < castigo) castigo = userData.xp || 0; 
                    await db.removeXP(userKey, castigo);
                    resultadoTxt = `${pick(pescaCastigo)}\n❌ Perdiste *${castigo} XP*.`;
                }

                if (premio > 0) await db.addXP(userKey, premio);

                let finalMsg = `*RESULTADO DE PESCA* 🎣\n\n${resultadoTxt}\n👤 @${number(sender)}`;
                try { await sock.sendMessage(remoteJid, { text: finalMsg, edit: msg.key, mentions: [userKey] }); } 
                catch (e) { await sock.sendMessage(remoteJid, { text: finalMsg, mentions: [userKey] }); }
            } finally {
                // 🔥 Liberamos al usuario pase lo que pase
                enUso.delete(userKey);
            }
        }

        // ==========================================
        // COMANDO: .minar
        // ==========================================
        if (command === 'minar') {
            const remaining = cooldown - (now - (userData.lastMinar || 0));

            if (remaining > 0) {
                const m = Math.floor(remaining / 60000);
                const s = Math.floor((remaining % 60000) / 1000);
                return reply(`⏳ Tus brazos están cansados. Debes esperar *${m}m ${s}s* para volver a minar.`);
            }

            // 🔥 Bloqueamos al usuario y guardamos su tiempo ANTES de la animación
            enUso.add(userKey);
            await db.setUser(userKey, { lastMinar: now });

            try {
                // Animación Inicial
                let msg = await sock.sendMessage(remoteJid, { text: `⛏️ @${number(sender)} encendió su antorcha y entró a la cueva oscura...`, mentions: [userKey] });
                await esperar(1500);
                try { await sock.sendMessage(remoteJid, { text: `⛏️ @${number(sender)} está picando una pared de piedra...\n\n*¡Clank! ¡Clank! ¡Clank!*`, edit: msg.key, mentions: [userKey] }); } catch (e) {}
                await esperar(2000);

                // Calcular probabilidad
                let rand = Math.random() * 100;
                let premio = 0;
                let resultadoTxt = '';

                if (rand < 5) { 
                    premio = randXP(4000, 6000); // 5% Legendario
                    resultadoTxt = `${pick(minaLegendaria)}\n💰 Ganaste *${premio} XP*.`;
                } else if (rand < 20) { 
                    premio = randXP(1500, 2500); // 15% Épico
                    resultadoTxt = `${pick(minaEpica)}\n💰 Ganaste *${premio} XP*.`;
                } else if (rand < 70) { 
                    premio = randXP(400, 1000);  // 50% Normal
                    resultadoTxt = `${pick(minaNormal)}\n💰 Ganaste *${premio} XP*.`;
                } else if (rand < 90) { 
                    premio = 0;                  // 20% Basura
                    resultadoTxt = `${pick(minaBasura)}\n💸 No ganas nada de XP.`;
                } else { 
                    let castigo = randXP(500, 1000); // 10% Mala suerte
                    if ((userData.xp || 0) < castigo) castigo = userData.xp || 0; 
                    await db.removeXP(userKey, castigo);
                    resultadoTxt = `${pick(minaCastigo)}\n❌ Perdiste *${castigo} XP*.`;
                }

                if (premio > 0) await db.addXP(userKey, premio);

                let finalMsg = `*RESULTADO DE MINERÍA* ⛏️\n\n${resultadoTxt}\n👤 @${number(sender)}`;
                try { await sock.sendMessage(remoteJid, { text: finalMsg, edit: msg.key, mentions: [userKey] }); } 
                catch (e) { await sock.sendMessage(remoteJid, { text: finalMsg, mentions: [userKey] }); }
            } finally {
                // 🔥 Liberamos al usuario pase lo que pase
                enUso.delete(userKey);
            }
        }
    }
};
