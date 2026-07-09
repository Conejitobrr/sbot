'use strict';

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function cleanJid(jid = '') {
    return String(jid).split(':')[0];
}

function number(jid = '') {
    return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

module.exports = {
    commands: ['ruleta', 'ruletarusa'],
    execute: async ({ sock, remoteJid, sender, args, command, db, reply, fromGroup }) => {
        if (!fromGroup) {
            return reply('❌ Este comando solo funciona en grupos.');
        }

        const userKey = cleanJid(sender);
        const userData = await db.getUser(userKey);

        if (!args[0]) {
            return reply('🔫 Debes ingresar una cantidad para apostar tu vida.\n\nEjemplo:\n*.ruleta 500*');
        }

        let apuesta = parseInt(args[0]);
        
        if (isNaN(apuesta) || apuesta <= 0) {
            return reply('𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 🙄 Ingresa una cantidad válida, no me hagas perder el tiempo.');
        }

        if ((userData.xp || 0) < apuesta) {
            return reply(`𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 🤣 ¿Apostando lo que no tienes? Tu saldo es de miserables *${userData.xp || 0} XP*. Consigue dinero y vuelve.`);
        }

        // Descontamos la apuesta inmediatamente al iniciar el juego
        await db.removeXP(userKey, apuesta);

        let arrayMenciones = [userKey];
        let tagNombre = `@${number(userKey)}`;

        // ==========================================
        // MOTOR DE ANIMACIÓN: LA RULETA
        // ==========================================
        let frames = [
            `🔫 *RULETA RUSA* 🔫\n────────────────\n\n_𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕 pone una bala en el revólver..._`,
            `🔫 *RULETA RUSA* 🔫\n────────────────\n\n🔄 _Girando el tambor rápidamente..._`,
            `🔫 *RULETA RUSA* 🔫\n────────────────\n\n😰 _Apuntando a la cabeza de ${tagNombre}..._\n\n*¡GATILLO PRESIONADO!*`
        ];

        // Frame 1: Carga el arma
        let msg = await sock.sendMessage(remoteJid, { text: frames[0] });
        let mensajeId = msg.key;

        // Frame 2: Gira el tambor
        await esperar(2000);
        await sock.sendMessage(remoteJid, { text: frames[1], edit: mensajeId });
        
        // Frame 3: Apunta y dispara (Añadimos la mención para que le vibre el celular)
        await esperar(2000);
        await sock.sendMessage(remoteJid, { text: frames[2], edit: mensajeId, mentions: arrayMenciones });
        
        // Tensión máxima antes del resultado final
        await esperar(2800); 

        // ==========================================
        // RESULTADO FINAL: 1 entre 6 de morir (16.6% de probabilidad)
        // ==========================================
        let balaEnBocacha = Math.floor(Math.random() * 6) === 0; 
        
        let textoFinal = `🔫 *RULETA RUSA* 🔫\n────────────────\n\n`;

        if (balaEnBocacha) {
            // PIERDE TODO LO APOSTADO
            const frasesMuerte = [
                `𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 💥 *¡PUM!* Jajaja, acabo de limpiar el piso con tus sesos. Acabas de perder tus *${apuesta} XP*. ¡Patético! 🤣`,
                `𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 💥 *¡BANG!* Directo al cráneo. Gracias por los *${apuesta} XP*, los usaré para comprarme mejor RAM. 💻✨`,
                `𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 💥 *¡BOOM!* Uy... eso debió doler. Bueno, un perdedor menos en el grupo. Yo me quedo con tu dinero. 🤑`
            ];
            textoFinal += frasesMuerte[Math.floor(Math.random() * frasesMuerte.length)];
        } else {
            // SOBREVIVE: Gana el doble de lo que apostó
            let ganancia = apuesta * 2; 
            await db.addXP(userKey, ganancia);
            
            const frasesSobrevive = [
                `𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 💨 *¡Clic!* ...Tsk, tuviste suerte esta vez, la recámara estaba vacía. Toma tus *${ganancia} XP* y lárgate de mi vista. 😒`,
                `𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 💨 *¡Clic!* Nada... solo aire. Hoy no es tu día de morir. Te llevas *${ganancia} XP*, pero la próxima no te salvarás. 🔪`,
                `𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕: 💨 *¡Clic!* Sobreviviste... qué aburrido. Aquí tienes *${ganancia} XP*. Vuelve a jugar si tienes agallas. 🙄`
            ];
            textoFinal += frasesSobrevive[Math.floor(Math.random() * frasesSobrevive.length)];
        }

        // Editamos el mensaje por última vez con el resultado final
        await sock.sendMessage(remoteJid, { text: textoFinal, edit: mensajeId, mentions: arrayMenciones });
    }
};
