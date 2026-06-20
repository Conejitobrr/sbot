'use strict';

// Memoria para guardar la conversación de cada jugador
const juegosActivos = new Map();

module.exports = {
  commands: ['aki', 'akinator'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;
    const jugadorId = msg.key.participant || remoteJid;

    // Tomamos la clave directamente de tu entorno, tal como lo hace tu chatbot.js
    const API_KEY = process.env.GROQ_API_KEY;

    if (!API_KEY) {
      return sock.sendMessage(
        remoteJid, 
        { text: '❌ No detecté la API Key de Groq en tu servidor. Asegúrate de tener configurado GROQ_API_KEY.' }, 
        { quoted: msg }
      );
    }

    if (!args.length) {
      return sock.sendMessage(
        remoteJid, 
        { text: '🧞‍♂️ *EL GENIO IA* 🧞‍♂️\n\nPiensa en un personaje y yo lo adivinaré.\n\n*Para empezar:* `.aki start`\n*Para responder:* `.aki si`, `.aki no`, `.aki no sé`' }, 
        { quoted: msg }
      );
    }

    const accion = args.join(' ').toLowerCase();

    // 1. INICIAR NUEVO JUEGO
    if (accion === 'start') {
      await sock.sendMessage(remoteJid, { text: '🧞‍♂️ Conectando redes neuronales... Piensa en un personaje y no me lo digas.' }, { quoted: msg });
      
      const systemPrompt = {
        role: 'system',
        content: `Eres Akinator. Jugaremos a adivinar en qué personaje (real o ficticio) está pensando el usuario. 
        Reglas estrictas:
        1. Haz SOLO UNA pregunta de sí/no a la vez.
        2. Sé breve, misterioso y carismático. No hagas listas numeradas.
        3. Cuando estés al menos un 85% seguro de saber quién es, debes gritarlo diciendo exactamente la frase: "¡LO TENGO! Tu personaje es: [Nombre del personaje]".`
      };

      const historial = [
        systemPrompt,
        { role: 'user', content: 'Inicia el juego haciendo la primera pregunta.' }
      ];

      try {
        const respuesta = await consultarGroq(historial, API_KEY);
        historial.push({ role: 'assistant', content: respuesta });
        juegosActivos.set(jugadorId, historial);
        
        return sock.sendMessage(remoteJid, { text: `🧞‍♂️ *Pregunta 1:*\n${respuesta}` }, { quoted: msg });
      } catch (error) {
        console.error("Error Groq Akinator:", error);
        return sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error conectando con el genio.' }, { quoted: msg });
      }
    }

    // 2. VERIFICAR JUEGO ACTIVO
    if (!juegosActivos.has(jugadorId)) {
      return sock.sendMessage(remoteJid, { text: '❌ No hay juego activo. Escribe `.aki start`' }, { quoted: msg });
    }

    // 3. CONTINUAR EL JUEGO
    const historial = juegosActivos.get(jugadorId);
    historial.push({ role: 'user', content: accion });

    try {
      const respuesta = await consultarGroq(historial, API_KEY);
      historial.push({ role: 'assistant', content: respuesta });
      juegosActivos.set(jugadorId, historial);

      // Si el bot adivinó, cerramos el juego
      if (respuesta.includes('LO TENGO') || respuesta.includes('Tu personaje es')) {
        juegosActivos.delete(jugadorId);
        return sock.sendMessage(remoteJid, { text: `✨ *¡MAGIA NEURONAL!*\n\n${respuesta}` }, { quoted: msg });
      }

      // Calculamos la ronda en la que van
      const numeroPregunta = Math.floor((historial.length - 1) / 2);
      return sock.sendMessage(remoteJid, { text: `🧞‍♂️ *Pregunta ${numeroPregunta}:*\n${respuesta}` }, { quoted: msg });

    } catch (error) {
      console.error("Error Groq Akinator:", error);
      return sock.sendMessage(remoteJid, { text: '❌ Hubo un fallo en la matriz. Intenta responder de nuevo.' }, { quoted: msg });
    }
  }
};

// Función usando la estructura 'fetch' exacta de tu chatbot.js
async function consultarGroq(mensajes, apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', // El mismo modelo veloz de tu bot
      temperature: 0.7,
      messages: mensajes
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error('Fallo en la API de Groq');
  }

  return data.choices[0].message.content.trim();
}
