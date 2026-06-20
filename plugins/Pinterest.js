'use strict';

const axios = require('axios');

module.exports = {
  commands: ['pinterest', 'pin'],

  async execute(ctx) {
    const { sock, remoteJid, args, msg } = ctx;

    if (!args.length) {
      return sock.sendMessage(
        remoteJid, 
        { text: '❌ *Uso correcto:* .pinterest [búsqueda]\n*Ejemplo:* .pinterest fondos de pantalla oscuros' }, 
        { quoted: msg }
      );
    }

    const query = args.join(' ');
    await sock.sendMessage(remoteJid, { text: `🔍 Infiltrándose en Pinterest buscando: *${query}*...` }, { quoted: msg });

    try {
      // 1. Preparamos el paquete de datos oculto que Pinterest usa en su propio buscador
      const queryData = {
        options: {
          isPrefetch: false,
          query: query,
          scope: "pins",
          no_fetch_context_on_resource: false
        },
        context: {}
      };

      // 2. Construimos la URL apuntando directo al motor de búsqueda interno de Pinterest
      const encodedUrl = encodeURIComponent(`/search/pins/?q=${query}`);
      const encodedData = encodeURIComponent(JSON.stringify(queryData));
      const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=${encodedUrl}&data=${encodedData}`;

      // 3. Nos disfrazamos de navegador humano para que no nos bloqueen
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      // 4. Extraemos el arreglo de resultados directamente de su JSON oficial
      const results = response.data.resource_response.data.results;
      
      // Filtramos para quedarnos SOLO con las URLs de las imágenes originales en máxima calidad
      const images = results
        .map(pin => pin.images?.orig?.url)
        .filter(url => url !== undefined);

      if (!images || images.length === 0) {
        return sock.sendMessage(remoteJid, { text: '❌ No se encontraron imágenes en Pinterest para esa búsqueda.' }, { quoted: msg });
      }

      // 5. Seleccionamos una al azar y la enviamos
      const randomImage = images[Math.floor(Math.random() * images.length)];

      await sock.sendMessage(
        remoteJid, 
        { 
          image: { url: randomImage }, 
          caption: `📌 *Pinterest:* ${query}` 
        }, 
        { quoted: msg }
      );

    } catch (error) {
      console.error("Error en extracción directa de Pinterest:", error.message);
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al extraer la imagen directamente de Pinterest.' }, { quoted: msg });
    }
  }
};
