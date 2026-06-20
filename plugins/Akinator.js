'use strict';

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
        text: '🧞‍♂️ *AKINATOR IA*\n\nPiensa en un personaje real o ficticio y no me lo digas.\n\n*Comandos:*\n.aki start (Iniciar)\n.aki [tu respuesta] (Ej: .aki si, .aki no, .aki no se)' 
      }, { quoted: msg });
    }

    const accion = args.join(' ').toLowerCase().trim();

    if (accion === 'start') {
      await sock.sendMessage(remoteJid, { text: '🧞‍♂️ Conectando red neuronal... Piensa en tu personaje.' }, { quoted: msg });
      
      // 🔥 EL NUEVO PROMPT BLINDADO Y AGRESIVO
      const systemPrompt = {
        role: 'system',
        content: `Eres el motor lógico de Akinator. Tu objetivo es adivinar el personaje en el que piensa el usuario usando el juego de las 20 preguntas (respuestas de Sí/No).

        REGLAS DE HIERRO INQUEBRANTABLES:
        1. PROHIBIDO ADIVINAR NOMBRES EN LAS PREGUNTAS: NUNCA, bajo ninguna circunstancia, preguntes si el personaje es alguien específico (Ejemplo PROHIBIDO: "¿Tu personaje es Batman?").
        2. SOLO PREGUNTAS DE ATRIBUTOS: Todas tus preguntas deben ser obligatoriamente sobre características (Ejemplos CORRECTOS: "¿Es un personaje animado?", "¿Usa magia?", "¿Es de una película?").
        3. HAZ SOLO UNA PREGUNTA CORTA a la vez. No justifiques ni expliques por qué lo preguntas.
        4. ÚNICAMENTE cuando hayas acorralado al personaje y estés 100% seguro (después de varias preguntas), detendrás el juego declarando la victoria con ESTE FORMATO EXACTO: "¡LO TENGO! Tu personaje es: [Nombre del personaje]".`
      };

      const historial = [
        systemPrompt,
        { role: 'user', content: 'Inicia el juego haciendo la primera pregunta de atributo.' }
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

    if (!juegosActivos.has(jugadorId)) {
      return sock.sendMessage(remoteJid, { text: '❌ No tienes un juego activo. Inicia con *.aki start*' }, { quoted: msg });
    }

    const historial = juegosActivos.get(jugadorId);
    
    // Si el usuario da una respuesta rara, le forzamos a recordar la regla a la IA sin que el usuario lo vea
    historial.push({ 
      role: 'user', 
      content: `${accion}. (Recuerda la regla: NUNCA adivines un nombre en tu pregunta, solo pregunta sobre atributos hasta estar 100% seguro).` 
    });

    try {
      const respuesta = await consultarGroq(historial, API_KEY);
      
      // Limpiamos la trampa de memoria para no ensuciar el historial
      historial[historial.length - 1].content = accion; 
      historial.push({ role: 'assistant', content: respuesta });
      juegosActivos.set(jugadorId, historial);

      if (respuesta.toUpperCase().includes('LO TENGO') || respuesta.toUpperCase().includes('TU PERSONAJE ES')) {
        juegosActivos.delete(jugadorId);
        return sock.sendMessage(remoteJid, { text: `✨ *¡RESULTADO FINAL!*\n\n${respuesta}` }, { quoted: msg });
      }

      const numeroPregunta = Math.floor((historial.length - 1) / 2);

      if (numeroPregunta >= 20) {
        historial.push({ role: 'user', content: 'Dime ya tu mejor suposición final, debes decir el nombre obligatoriamente usando la frase: ¡LO TENGO! Tu personaje es: ...' });
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

async function consultarGroq(mensajes, apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1, // Temperatura reducida casi a cero para que sea un robot lógico absoluto
      max_tokens: 150,
      messages: mensajes
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error('Groq API falló');
  }

  return data.choices[0].message.content.trim();
}
