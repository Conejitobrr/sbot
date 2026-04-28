'use strict'

const events = require('../lib/events')

module.exports = {
  commands: ['menu', 'help'],

  async execute({ sock, remoteJid, pushName, config, prefix }) {

    const p = prefix || '.' // ← FIX AQUÍ

    const active = events.getState?.()

    let eventText = '🔕 Sin eventos activos'

    if (active) {
      const map = {
        bonus: '💰 Bonus XP activo',
        rob: '😈 Robo activo',
        double: '⚡ Doble XP activo',
        trivia: '🎯 Trivia en curso'
      }

      eventText = map[active.type] || '🎮 Evento activo'
    }

    const text = `
╔══════════════════════╗
     🌌 *SiriusBot*
╚══════════════════════╝

👤 Hola *${pushName}* ✨
Bienvenido a *${config.botName}*

━━━━━━━━━━━━━━━━━━━
🎮 *EVENTOS*
━━━━━━━━━━━━━━━━━━━
➤ ${eventText}

━━━━━━━━━━━━━━━━━━━
💰 *ECONOMÍA*
━━━━━━━━━━━━━━━━━━━
➤ *${p}xp* → Ver tu experiencia  
➤ *${p}rank* → Ranking del chat  
➤ *${p}claim* → Recompensa diaria  
➤ *${p}robar* → Robar monedas mencionando a alguien
➤ *${p}dar* → Transferir dinero mencionando a alguien 

━━━━━━━━━━━━━━━━━━━
😂 *DIVERSIÓN*
━━━━━━━━━━━━━━━━━━━
➤ *${p}piropo* → Enviar piropo 💘  
➤ *${p}pregunta* → Responder preguntas 
➤ *${p}trivia* → juega preguntados con todos
➤ *${p}formarpareja* → forma pareja al azar
➤ *${p}formarparejas* → forma parejas en grupo
➤ *${p}gay* → mencionando a alguien
➤ *${p}topgays* → top gays del grupo
➤ *${p}hornycard* → carta horny


━━━━━━━━━━━━━━━━━━━
🎵 *DESCARGAS*
━━━━━━━━━━━━━━━━━━━
➤ *${p}play* → Descargar audio 🎧  
➤ *${p}ytmp4* → Descargar video 🎬
➤ *${p}tiktok* → Descarga video de Tiktok por enlace
➤ *${p}fb* → Descarga video de Facebook por enlace  
➤ *${p}ig* → Descarga video de Instagram por enlace  



━━━━━━━━━━━━━━━━━━━
🎨 *MULTIMEDIA*
━━━━━━━━━━━━━━━━━━━
➤ *${p}sticker* → Crear sticker  
➤ *${p}toimage* → Sticker a imagen  
➤ *${p}tovideo* → Sticker a video  
➤ *${p}toanime* → Estilo anime  
➤ *${p}tts* → Texto a voz  
➤ *${p}attp* → Texto a sticker

━━━━━━━━━━━━━━━━━━━
⚙️ *SISTEMA*
━━━━━━━━━━━━━━━━━━━
➤ *${p}prem* → Estado premium  
➤ *${p}notify* → Notificaciones  

━━━━━━━━━━━━━━━━━━━
👑 *OWNER*
━━━━━━━━━━━━━━━━━━━
➤ *${p}addxp* → Añadir experiencia  
➤ *${p}update* → Actualizar bot  

━━━━━━━━━━━━━━━━━━━
🚀 Usa los comandos y sube de nivel  
👑 Conviértete en leyenda del chat
`

    await sock.sendMessage(remoteJid, { text })
  }
}
