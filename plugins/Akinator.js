'use strict';

// Memoria aislada por jugador
const juegosActivos = new Map();

module.exports = {
  commands: ['aki', 'akinator'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;
    const jugadorId = msg.key.participant || remoteJid;
    const API_KEY = process.env.GROQ_API_KEY;

    if (!API_KEY) {
      return sock.sendMessage(remoteJid, { text: '❌ No detecté la API Key de Groq.' }, { quoted: msg });
    }

    if (!args.length) {
      return sock.sendMessage(remoteJid, { 
        text: '🧞‍♂️ *AKINATOR COMPAÑERO IA*\n\nPiensa en un personaje real o ficticio.\n\n*Comandos:*\n.aki start (Iniciar)\n.aki [tu respuesta] (Ej: .aki si, .aki no, .aki no lo se)' 
      }, { quoted: msg });
    }

    const accion = args.join(' ').toLowerCase().trim();

    // 1. INICIALIZACIÓN CON INSTRUCCIONES ESTRICTAS DE LÓGICA
    if (accion === 'start') {
      await sock.sendMessage(remoteJid, { text: '🧞‍♂️ Ajustando precisión mental... Piensa en tu personaje.' }, { quoted: msg });
      
      const systemPrompt = {
        role: 'system',
        content: `Eres el motor lógico de Akinator. Tu objetivo es adivinar el personaje (real, ficticio, anime, histórico, etc.) en el que piensa el usuario usando la estrategia más óptima de descarte binario (Juego de las 20 preguntas).
        
        REGLAS DE PRECISIÓN ABSOLUTA:
        1. Haz EXACTAMENTE UNA pregunta de Sí/No a la vez. No justifiques tu pregunta, ve directo al grano.
        2. Analiza rigurosamente la última respuesta del usuario para descartar grupos enteros de personajes (ej: si dice que NO es real, elimina personas vivas/históricas).
        3. Mantén un hilo lógico. No repitas preguntas ni hagas preguntas contradictorias.
        4. Formula tus preguntas de manera sutil pero directa (Ej: "¿Tu personaje es un anime?", "¿Es una mujer?").
        5. Cuando estés COMPLETAMENTE SEGURO (90%+ de certeza), debes detener las preguntas y declarar el personaje usando EXACTAMENTE este formato: "¡LO TENGO! Tu personaje es: [Nombre del Personaje]".`
      };

      const historial = [
        systemPrompt,
        { role: 'user', content: 'Comienza el juego lanzando la Pregunta 1.' }
      ];

      try {
        const respuesta = await consultarGroq(historial, API_KEY);
        historial.push({ role: 'assistant', content: respuesta });
        juegosActivos.set(jugadorId, historial);
        
        return sock.sendMessage(remoteJid, { text: `🧞‍♂️ *Pregunta 1:*\n${respuesta}` }, { quoted: msg });
      } catch (error) {
        console.error("Error Akinator:", error);
        return sock.sendMessage(remoteJid, { text: '❌ Error al iniciar el Genio.' }, { quoted: msg });
      }
    }

    // 2. VERIFICACIÓN DE JUEGO EN CURSO
    if (!juegosActivos.has(jugadorId)) {
      return sock.sendMessage(remoteJid, { text: '❌ No tienes un juego activo. Inicia con *.aki start*' }, { quoted: msg });
    }

    // 3. PROCESAMIENTO DE RESPUESTAS
    const historial = juegosActivos.get(jugadorId);
    historial.push({ role: 'user', content: accion });

    try {
      const respuesta = await consultarGroq(historial, API_KEY);
      historial.push({ role: 'assistant', content: respuesta });
      juegosActivos.set(jugadorId, historial);

      // Si la IA arroja la frase clave de victoria, finaliza la sesión
      if (respuesta.toUpperCase().includes('LO TENGO') || respuesta.toUpperCase().includes('TU PERSONAJE ES')) {
        juegosActivos.delete(jugadorId);
        return sock.sendMessage(remoteJid, { text: `✨ *¡RESULTADO FINAL!*\n\n${respuesta}` }, { quoted: msg });
      }

      // Contador exacto de vueltas basándose en la longitud del array
      const numeroPregunta = Math.floor((historial.length - 1) / 2);

      // Si llega a la pregunta 20 y no está seguro, fuerza una respuesta
      if (numeroPregunta >= 20) {
        historial.push({ role: 'user', content: 'Dime ya tu mejor suposición final basándote en todo lo anterior.' });
        const suposicionFinal = await consultarGroq(historial, API_KEY);
        juegosActivos.delete(jugadorId);
        return sock.sendMessage(remoteJid, { text: `🧞‍♂️ *Llegamos al límite (Pregunta 20):*\n\n${suposicionFinal}` }, { quoted: msg });
      }
      
      return sock.sendMessage(remoteJid, { text: `🧞‍♂️ *Pregunta ${numeroPregunta}:*\n${respuesta}` }, { quoted: msg });

    } catch (error) {
      console.error("Error Akinator Step:", error);
      return sock.sendMessage(remoteJid, { text: '❌ Error de sincronización. Repite tu respuesta.' }, { quoted: msg });
    }
  }
};

// Conexión limpia y de baja temperatura a Groq
async function consultarGroq(mensajes, apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2, // 🔥 CLAVE: Temperatura ultra baja para forzar lógica estricta y cero inventos
      max_tokens: 150,  // Respuestas cortas y precisas
      messages: mensajes
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error('Groq API falló');
  }

  return data.choices[0].message.content.trim();
}
