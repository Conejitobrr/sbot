'use strict';

// Función para pausar y crear el efecto de animación
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function cleanJid(jid = '') {
    return String(jid).split(':')[0];
}

function number(jid = '') {
    return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

module.exports = {
    // Ambos comandos se manejan en este mismo archivo
    commands: ['pescar', 'minar'],
    
    async execute(ctx) {
        const { sock, remoteJid, sender, command, db, reply, fromGroup } = ctx;

        if (!fromGroup) {
            return reply('❌ Estos comandos son más divertidos en grupos.');
        }

        const userKey = cleanJid(sender);
        const userData = await db.getUser(userKey);
        const now = Date.now();

        // ==========================================
        // COMANDO: .pescar
        // ==========================================
        if (command === 'pescar') {
            // Cooldown de 5 minutos (300,000 ms)
            const cooldown = 5 * 60 * 1000; 
            const remaining = cooldown - (now - (userData.lastPescar || 0));

            if (remaining > 0) {
                const m = Math.floor(remaining / 60000);
                const s = Math.floor((remaining % 60000) / 1000);
                return reply(`⏳ Tus peces se asustaron. Debes esperar *${m}m ${s}s* para volver a pescar.`);
            }

            // Animación Inicial
            let textoFrame = `🎣 @${number(sender)} ha lanzado la caña al agua...`;
            let msg = await sock.sendMessage(remoteJid, { 
                text: textoFrame, 
                mentions: [userKey] 
            });
            
            await esperar(1500);
            textoFrame = `🎣 @${number(sender)} siente un fuerte tirón... *¡Algo picó!*`;
            
            try { 
                await sock.sendMessage(remoteJid, { text: textoFrame, edit: msg.key, mentions: [userKey] }); 
            } catch (e) {}
            
            await esperar(2000);

            // Calcular probabilidad de premio
            let rand = Math.random() * 100;
            let premio = 0;
            let resultadoTxt = '';

            if (rand < 5) { 
                // 5% Legendario
                premio = 1000;
                resultadoTxt = `🦈 ¡INCREÍBLE! Pescaste un *Megalodón* y lo vendiste en el mercado negro por *${premio} XP*.`;
            } else if (rand < 20) { 
                // 15% Épico
                premio = 500;
                resultadoTxt = `🐡 ¡Genial! Pescaste un *Pez Globo Dorado*. Ganaste *${premio} XP*.`;
            } else if (rand < 70) { 
                // 50% Normal
                premio = 150;
                resultadoTxt = `🐟 Pescaste un hermoso *Salmón*. Ganaste *${premio} XP*.`;
            } else if (rand < 90) { 
                // 20% Basura
                premio = 0;
                resultadoTxt = `🥾 Qué asco... Pescaste una *bota vieja y apestosa*. No ganas nada de XP.`;
            } else { 
                // 10% Mala suerte
                let castigo = 100;
                if ((userData.xp || 0) < castigo) castigo = userData.xp || 0; 
                await db.removeXP(userKey, castigo);
                resultadoTxt = `🐊 ¡CUIDADO! Un *cocodrilo* salió del agua y te mordió. Perdiste *${castigo} XP* pagando los vendajes.`;
            }

            // Sumar premio y actualizar tiempo
            if (premio > 0) {
                await db.addXP(userKey, premio);
            }
            await db.setUser(userKey, { lastPescar: now });

            // Mostrar resultado final
            let finalMsg = `*RESULTADO DE PESCA* 🎣\n\n${resultadoTxt}\n👤 @${number(sender)}`;
            try { 
                await sock.sendMessage(remoteJid, { text: finalMsg, edit: msg.key, mentions: [userKey] }); 
            } catch (e) {
                await sock.sendMessage(remoteJid, { text: finalMsg, mentions: [userKey] });
            }
        }

        // ==========================================
        // COMANDO: .minar
        // ==========================================
        if (command === 'minar') {
            // Cooldown de 5 minutos (300,000 ms)
            const cooldown = 5 * 60 * 1000; 
            const remaining = cooldown - (now - (userData.lastMinar || 0));

            if (remaining > 0) {
                const m = Math.floor(remaining / 60000);
                const s = Math.floor((remaining % 60000) / 1000);
                return reply(`⏳ Tus brazos están cansados. Debes esperar *${m}m ${s}s* para volver a minar.`);
            }

            // Animación Inicial
            let textoFrame = `⛏️ @${number(sender)} encendió su antorcha y entró a la cueva oscura...`;
            let msg = await sock.sendMessage(remoteJid, { 
                text: textoFrame, 
                mentions: [userKey] 
            });
            
            await esperar(1500);
            textoFrame = `⛏️ @${number(sender)} está picando una pared de piedra...\n\n*¡Clank! ¡Clank! ¡Clank!*`;
            
            try { 
                await sock.sendMessage(remoteJid, { text: textoFrame, edit: msg.key, mentions: [userKey] }); 
            } catch (e) {}
            
            await esperar(2000);

            // Calcular probabilidad de premio
            let rand = Math.random() * 100;
            let premio = 0;
            let resultadoTxt = '';

            if (rand < 5) { 
                // 5% Legendario
                premio = 1200;
                resultadoTxt = `💎 ¡JACKPOT! Encontraste un gigantesco *Diamante Brillante*. Ganaste *${premio} XP*.`;
            } else if (rand < 20) { 
                // 15% Épico
                premio = 600;
                resultadoTxt = `🥇 ¡Excelente! Rompiste la piedra y salió un *Lingote de Oro*. Ganaste *${premio} XP*.`;
            } else if (rand < 70) { 
                // 50% Normal
                premio = 150;
                resultadoTxt = `🪨 Trabajaste duro y recolectaste *Carbón y Hierro*. Ganaste *${premio} XP*.`;
            } else if (rand < 90) { 
                // 20% Basura
                premio = 0;
                resultadoTxt = `🕸️ Picaste en el lugar equivocado. Solo había *telarañas y tierra*. No ganas nada de XP.`;
            } else { 
                // 10% Mala suerte
                let castigo = 150;
                if ((userData.xp || 0) < castigo) castigo = userData.xp || 0; 
                await db.removeXP(userKey, castigo);
                resultadoTxt = `💥 ¡DERRUMBE! Un pedazo de techo te cayó en la cabeza. Perdiste *${castigo} XP* en medicinas.`;
            }

            // Sumar premio y actualizar tiempo
            if (premio > 0) {
                await db.addXP(userKey, premio);
            }
            await db.setUser(userKey, { lastMinar: now });

            // Mostrar resultado final
            let finalMsg = `*RESULTADO DE MINERÍA* ⛏️\n\n${resultadoTxt}\n👤 @${number(sender)}`;
            try { 
                await sock.sendMessage(remoteJid, { text: finalMsg, edit: msg.key, mentions: [userKey] }); 
            } catch (e) {
                await sock.sendMessage(remoteJid, { text: finalMsg, mentions: [userKey] });
            }
        }
    }
};
