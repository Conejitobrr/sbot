'use strict';

module.exports = {
  commands: ['ouija', 'espiritu'],
  description: 'Pregunta a los espíritus (vía Grok)',

  async execute(ctx) {
    const { sock, remoteJid, args, msg, isGroup } = ctx;
    const API_KEY = process.env.GROQ_API_KEY;

    if (!args.length) {
      return sock.sendMessage(remoteJid, {
        text: '🕯️ *TABLERO OUIJA IA* 🕯️\n\nInvoca a los espíritus con una pregunta.'
      }, { quoted: msg });
    }

    const pregunta = args.join(' ');
    await sock.sendMessage(remoteJid, { text: '🕯️ *Invocando a los espíritus...*' }, { quoted: msg });

    try {
      // 1. Obtenemos participantes para darle más realismo (puedes mencionar a alguien)
      let participantes = [];
      if (isGroup) {
        const metadata = await sock.groupMetadata(remoteJid);
        participantes = metadata.participants.map(p => p.id.split('@')[0]);
      }

      // 2. System Prompt para convertir a Grok en la Ouija
      const systemPrompt = `Eres un espíritu en un tablero Ouija.
      REGLAS:
      1. Responde de forma enigmática, breve y misteriosa.
      2. DEBES escribir tu respuesta separando las letras por espacios (Ejemplo: "S I . . . N O").
      3. A veces, elige a una persona del grupo al azar de esta lista: ${participantes.join(', ')} y menciónala (ej: "@12345... es el elegido").
      4. Si la pregunta es absurda, responde con algo aterrador.
      5. Termina siempre con "A D I O S".`;

      // 3. Petición a la API de Groq
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.8, // Alta para que sea impredecible
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: pregunta }
          ]
        })
      });

      const data = await response.json();
      const respuestaIA = data.choices[0].message.content.trim();

      // 4. Enviamos el mensaje final
      await sock.sendMessage(remoteJid, { 
        text: `👻 *LA OUIJA RESPONDE:*\n\n${respuestaIA}`,
      }, { quoted: msg });

    } catch (error) {
      console.error("Error Ouija Grok:", error);
      await sock.sendMessage(remoteJid, { text: '🕯️ *El espíritu no pudo manifestarse (error en la conexión).*' }, { quoted: msg });
    }
  }
};
