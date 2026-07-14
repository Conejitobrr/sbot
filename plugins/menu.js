'use strict';

const events = require('../lib/events');

module.exports = {
  commands: ['menu', 'help', 'menú'],

  async execute({ sock, msg, remoteJid, pushName, config }) {
    const p = config.prefix || '.';

    const active = events.getState?.();
    let eventText = '🔕 Sin eventos activos';

    if (active) {
      const map = {
        bonus: '💰 Bonus XP activo',
        rob: '😈 Robo XP activo',
        trivia: '🎯 Trivia en curso'
      };

      eventText = map[active.type] || '🎮 Evento activo';
    }

    const text =
`╔══════════════════════╗
        🌌 *${config.botName || 'SiriusBot'}*
╚══════════════════════╝

👤 Hola *${pushName || 'Usuario'}* ✨
⚙️ Prefijo: *${p}*

━━━━━━━━━━━━━━━━━━━
🎮 *EVENTOS ACTIVOS*
━━━━━━━━━━━━━━━━━━━
➤ ${eventText}

━━━━━━━━━━━━━━━━━━━
📌 *INFORMACIÓN Y UTILIDAD*
━━━━━━━━━━━━━━━━━━━
➤ *${p}perfil* → Ver tu perfil
➤ *${p}grupobot* → Únete al grupo oficial
➤ *${p}infobot* → Información del bot
➤ *${p}reportar* [error] → Reporta un bug al creador
➤ *${p}contacto* → Contactar con el desarrollador
➤ *${p}donar* → Apoya al creador
➤ *${p}clima* [ciudad] → Ver clima actual

━━━━━━━━━━━━━━━━━━━
🐾 *MASCOTAS*
━━━━━━━━━━━━━━━━━━━
➤ *${p}adoptar* [nombre] → Adopta compañero
➤ *${p}mascota* → Ver estado y perfil
➤ *${p}alimentar* → Dale de comer
➤ *${p}jugar* → Diviértete con él
➤ *${p}entrenar* → Gana mucha XP
➤ *${p}pasear* → Caminata relajante
➤ *${p}dormir* → Ponlo a descansar
➤ *${p}curar* → Sana sus heridas
➤ *${p}pelear* @user → Combate a muerte
➤ *${p}sacrificar* → Despedida irreversible

━━━━━━━━━━━━━━━━━━━
💰 *ECONOMÍA Y APUESTAS*
━━━━━━━━━━━━━━━━━━━
➤ *${p}claim* → Recompensa diaria
➤ *${p}rank* → Ranking del chat
➤ *${p}chambear* → Trabaja legalmente
➤ *${p}minar* → Minar no es seguro ☠️
➤ *${p}cazar* → Los animales no son amigos ☠️
➤ *${p}pescar* → Ten cuidado en el agua ⚠️
➤ *${p}robar* @user → Roba XP
➤ *${p}dar* @user → Transferir XP
➤ *${p}apostar* [cant] → Apuesta tu XP
➤ *${p}dado* → Lanza los dados
➤ *${p}tienda* → Ver catálogo
➤ *${p}comprar* → Comprar objetos
➤ *${p}inventario* → Ver tus objetos
➤ *${p}usar* → Usar objeto (ej: escudo)

━━━━━━━━━━━━━━━━━━━
🚔 *POLICÍA Y CÁRCEL*
━━━━━━━━━━━━━━━━━━━
➤ *${p}policia* → Atrapar ladrones
➤ *${p}denunciar* → Denunciar robo
➤ *${p}carcel* → Ver estado de cárcel
➤ *${p}fama* → Ver fama criminal
➤ *${p}sobornar* → Pagar soborno
➤ *${p}fianza* → Pagar fianza
➤ *${p}usar llave* → Escapar de la celda

━━━━━━━━━━━━━━━━━━━
🤖 *IA Y BÚSQUEDAS*
━━━━━━━━━━━━━━━━━━━
➤ *${p}bot* / *${p}simi* → Habla con la IA
➤ *${p}imagina* → Generar imagen
➤ *${p}google* [texto] → Buscar en Google
➤ *${p}wikipedia* [texto] → Buscar info
➤ *${p}imagen* [texto] → Buscar imágenes
➤ *${p}traducir* [texto] → Traductor

━━━━━━━━━━━━━━━━━━━
🎲 *JUEGOS*
━━━━━━━━━━━━━━━━━━━
➤ *${p}trivia* → Juego de preguntas
➤ *${p}ahorcado* → Adivina la palabra
➤ *${p}akinator* → Adivina tu personaje
➤ *${p}carrera* → Carrera de 🐎
➤ *${p}tutti* → Juego de Tuttifrutti
➤ *${p}michi* → Juega tres en raya

━━━━━━━━━━━━━━━━━━━
💖 *SOCIAL Y ROMANCE*
━━━━━━━━━━━━━━━━━━━
➤ *${p}formarpareja(s)* → Cupido aleatorio
➤ *${p}proponer* @user → Pídele matrimonio
➤ *${p}love* @user → Medidor de amor
➤ *${p}felizcumple* @user → Felicitar
➤ *${p}historiaromantica*
➤ *${p}piropo* / *${p}frase* / *${p}consejo*
➤ *${p}verdad* / *${p}reto*
➤ *${p}follar* @user
➤ *${p}hack* @user → Broma de hackeo
➤ *${p}clon* → Clona tu mensaje

━━━━━━━━━━━━━━━━━━━
🏆 *TOPS Y RANKINGS*
━━━━━━━━━━━━━━━━━━━
➤ *${p}top* [texto] → Crea un top 10 random
➤ *${p}topgays* → Top más gays del grupo

━━━━━━━━━━━━━━━━━━━
🤡 *CALCULADOR Y BROMAS*
━━━━━━━━━━━━━━━━━━━
➤ *${p}chisme* → Revela un chisme inventado
➤ *${p}funar* @user → Funa a alguien públicamente
➤ *${p}calculador* [texto] → Mide lo que sea
➤ *${p}gay* / *${p}lesbiana* / *${p}gay2*
➤ *${p}pajero* / *${p}pajera*
➤ *${p}puto* / *${p}puta*
➤ *${p}manco* / *${p}manca*
➤ *${p}rata* / *${p}prostituto(a)*

━━━━━━━━━━━━━━━━━━━
🎵 *DESCARGAS*
━━━━━━━━━━━━━━━━━━━
➤ *${p}play* → Audio de YouTube
➤ *${p}ytmp4* → Video de YouTube
➤ *${p}spotify* → Audio de Spotify (premium)
➤ *${p}song* → Audio alta calidad (premium)
➤ *${p}tiktok* → Video de TikTok
➤ *${p}fb* → Video de Facebook
➤ *${p}ig* → Video de Instagram

━━━━━━━━━━━━━━━━━━━
🎨 *MULTIMEDIA Y STICKERS*
━━━━━━━━━━━━━━━━━━━
➤ *${p}sticker* → Imagen/Video a sticker
➤ *${p}toimage* → Sticker a imagen
➤ *${p}tovideo* → Sticker a video
➤ *${p}attp* → Texto animado a sticker
➤ *${p}letra* → Letra de canciones
➤ *${p}toanime* → Estilo anime
➤ *${p}filtro* → Filtros de voz
➤ *${p}tts* → Texto a voz
➤ *${p}audios* → Audios divertidos
➤ *${p}fakeig* → Comentario fake de IG
➤ *${p}galaxia* → Crear HTML Galaxy of Love
➤ *${p}hornycard* → Tarjeta horny

━━━━━━━━━━━━━━━━━━━
🛡️ *ADMINISTRADORES*
━━━━━━━━━━━━━━━━━━━
➤ *${p}mutear* @user → Borra sus msjs aut.
➤ *${p}antilink* on/off → Bloqueo de links
➤ *${p}abrirgrupo* / *${p}cerrargrupo*
➤ *${p}linkgrupo* → Link del chat
➤ *${p}revoke* → Restablecer link
➤ *${p}kick* @user → Expulsar del grupo
➤ *${p}promote* @user → Dar admin
➤ *${p}demote* @user → Quitar admin
➤ *${p}warn* @user [motivo] → Dar advertencia
➤ *${p}unwarn* @user → Quitar advertencia
➤ *${p}warns* → Lista de usuarios advertidos
➤ *${p}resetwarn* @user → Limpiar advertencias
➤ *${p}enable* / *${p}disable welcome*
➤ *${p}enable* / *${p}disable bot*
➤ *${p}del* → Eliminar mensaje (respondiendo)
➤ *${p}contador* → Ver mensajes de inactivos

━━━━━━━━━━━━━━━━━━━
💎 *PREMIUM*
━━━━━━━━━━━━━━━━━━━
➤ *${p}prem* → Estado premium
➤ *${p}notify* → Notificaciones
➤ *${p}ver* → Ver archivo de 1 sola vez

━━━━━━━━━━━━━━━━━━━
👑 *ZONA OWNER*
━━━━━━━━━━━━━━━━━━━
➤ *${p}update* → Actualizar bot
➤ *${p}addxp* @user [cant] → Dar XP
➤ *${p}banuser* / *${p}unbanuser* @user
➤ *${p}antidelete* → Activar/Desactivar
➤ *${p}setgrupooficial* → Fijar grupo base
➤ *${p}darmascota* @user Raza | Nombre
➤ *${p}editarnombre* @user NuevoNombre
➤ *${p}darxpmascota* @user [cant]

🚀 Usa los comandos y sube de nivel`;

    await sock.sendMessage(
      remoteJid,
      { text },
      { quoted: msg }
    );
  }
};
