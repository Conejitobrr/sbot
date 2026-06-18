'use strict';

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 🔥 CANDADO ANTI-SPAM
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
// DICCIONARIOS DE VARIEDAD (CAZA)
// ==========================================
const cazaLegendaria = [
    '🐉 ¡MÍTICO! Lograste abatir a un *Dragón Ancestral* que aterrorizaba la región.',
    '🦄 ¡Increíble! Encontraste un *Unicornio Mágico* y te regaló parte de su magia por dejarlo ir.',
    '🦖 Viajaste en el tiempo y cazaste a un mismísimo *T-Rex*.',
    '🦍 Te adentraste en la nieve y lograste capturar al *Yeti*.',
    '🦇 ¡Sobreviviste a la noche! Cazaste al temible *Chupacabras*.',
    '🦅 En lo alto de la montaña, lograste atrapar a un *Grifo Mitológico*.'
];

const cazaEpica = [
    '🐻 Te enfrentaste cuerpo a cuerpo contra un enorme *Oso Pardo*.',
    '🐅 Tuviste una puntería perfecta y cazaste a un *Tigre de Bengala*.',
    '🦁 Te convertiste en el rey de la selva al cazar a un *León Africano*.',
    '🐊 Te metiste al pantano y cazaste a un *Cocodrilo del Nilo* gigante.',
    '🐆 Fuiste más rápido que un *Leopardo* y te quedaste con su piel.',
    '🦏 Lograste derribar a un pesado *Rinoceronte Negro*.'
];

const cazaNormal = [
    '🦌 Apuntaste con calma y cazaste un *Venado de Cola Blanca*.',
    '🐇 Fuiste silencioso y atrapaste a un par de *Conejos de Campo*.',
    '🐗 Te subiste a un árbol y cazaste a un *Jabalí Salvaje*.',
    '🦆 Te escondiste en los arbustos y cazaste un *Pato Silvestre*.',
    '🦃 Tuviste suerte y cazaste un *Pavo Gordo* para la cena.',
    '🦊 Viste un movimiento rápido y lograste cazar a un *Zorro Escurridizo*.',
    '🦡 Tuviste una pelea difícil, pero lograste cazar un *Tejón*.',
    '🐿️ Solo conseguiste cazar unas cuantas *Ardillas Gordas*.'
];

const cazaBasura = [
    '🌳 Viste una sombra gigante, disparaste... y era un *tronco de árbol*.',
    '🪨 Creíste ver a una tortuga gigante, pero le disparaste a una *roca redonda*.',
    '💨 Ibas a disparar, pero te dio alergia, *estornudaste*, y todos los animales huyeron.',
    '🔫 Tu presa estaba en la mira, pero tu *arma se atascó*.',
    '🏃‍♂️ Pisaste una rama seca, el animal te vio y *salió corriendo a toda velocidad*.',
    '📸 En lugar de disparar tu rifle, por error sacaste tu celular y le *tomaste una foto*.'
];

const cazaCastigo = [
    '🐍 Caminabas distraído y pisaste una *Víbora Venenosa*. Pagaste antídotos carísimos.',
    '🐻 Le disparaste a un osito, pero apareció su mamá y *tuviste que huir tirando tu dinero*.',
    '🕳️ Ibas caminando hacia atrás y *caíste en una trampa de cazadores*.',
    '🦌 Un venado que creías muerto se levantó y *te dio una patada en la cara*.',
    '🐝 Te apoyaste en un árbol equivocado y *pateaste un panal de abejas asesinas*.',
    '🐗 Un jabalí te embistió por la espalda y *rompió todo tu equipo de caza*.'
];

module.exports = {
    commands: ['cazar', 'hunt'],
    
    async execute(ctx) {
        const { sock, remoteJid, sender, db, reply, fromGroup } = ctx;

        if (!fromGroup) {
            return reply('❌ Este comando es más divertido en grupos.');
        }

        const userKey = cleanJid(sender);

        // 🔥 Bloqueo Anti-Spam
        if (enUso.has(userKey)) return;

        const userData = await db.getUser(userKey);
        const now = Date.now();
        const cooldown = 5 * 60 * 1000; // 5 minutos de espera

        const remaining = cooldown - (now - (userData.lastCazar || 0));

        if (remaining > 0) {
            const m = Math.floor(remaining / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            return reply(`⏳ Tus presas están escondidas. Debes esperar *${m}m ${s}s* para volver a cazar.`);
        }

        // 🔥 Ponemos el candado y registramos la hora de uso ANTES de animar
        enUso.add(userKey);
        await db.setUser(userKey, { lastCazar: now });

        try {
            // ==========================================
            // ANIMACIÓN DE CAZA
            // ==========================================
            let msg = await sock.sendMessage(remoteJid, { 
                text: `🌳 @${number(sender)} se adentra en lo profundo del bosque con su rifle en mano...`, 
                mentions: [userKey] 
            });
            await esperar(1500);

            try { 
                await sock.sendMessage(remoteJid, { 
                    text: `🐾 *¡CRACK!* Se escucha una rama romperse... @${number(sender)} apunta su arma 🎯`, 
                    edit: msg.key, 
                    mentions: [userKey] 
                }); 
            } catch (e) {}
            await esperar(2000);

            // ==========================================
            // CÁLCULO DE PROBABILIDADES
            // ==========================================
            let rand = Math.random() * 100;
            let premio = 0;
            let resultadoTxt = '';

            if (rand < 5) { 
                premio = randXP(4000, 6000); // 5% Legendario
                resultadoTxt = `${pick(cazaLegendaria)}\n💰 Recompensa: *+${premio} XP*.`;
            } else if (rand < 20) { 
                premio = randXP(1500, 2500); // 15% Épico
                resultadoTxt = `${pick(cazaEpica)}\n💰 Recompensa: *+${premio} XP*.`;
            } else if (rand < 70) { 
                premio = randXP(400, 1000);  // 50% Normal
                resultadoTxt = `${pick(cazaNormal)}\n💰 Recompensa: *+${premio} XP*.`;
            } else if (rand < 90) { 
                premio = 0;                  // 20% Basura
                resultadoTxt = `${pick(cazaBasura)}\n💸 No ganas nada de XP.`;
            } else { 
                let castigo = randXP(500, 1000); // 10% Mala suerte
                if ((userData.xp || 0) < castigo) castigo = userData.xp || 0; 
                await db.removeXP(userKey, castigo);
                resultadoTxt = `${pick(cazaCastigo)}\n❌ Perdiste: *-${castigo} XP*.`;
            }

            // Entregar el premio si ganó algo
            if (premio > 0) {
                await db.addXP(userKey, premio);
            }

            // ==========================================
            // RESULTADO FINAL
            // ==========================================
            let finalMsg = `*RESULTADO DE LA CACERÍA* 🏹\n\n${resultadoTxt}\n👤 Cazador: @${number(sender)}`;
            
            try { 
                await sock.sendMessage(remoteJid, { text: finalMsg, edit: msg.key, mentions: [userKey] }); 
            } catch (e) { 
                await sock.sendMessage(remoteJid, { text: finalMsg, mentions: [userKey] }); 
            }

        } finally {
            // 🔥 Quitamos el candado SIEMPRE (incluso si hay un error de red)
            enUso.delete(userKey);
        }
    }
};
