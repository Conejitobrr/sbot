'use strict';

let current = null;
const used = new Set();

function normalize(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const preguntas = [
  { q: '¿Capital de Perú?', a: ['lima'] },
  { q: '¿Capital de México?', a: ['ciudad de mexico', 'cdmx', 'mexico df'] },
  { q: '¿Capital de España?', a: ['madrid'] },
  { q: '¿Capital de Argentina?', a: ['buenos aires'] },
  { q: '¿Capital de Chile?', a: ['santiago', 'santiago de chile'] },

  { q: '¿Cuánto es 5 + 7?', a: ['12', 'doce'] },
  { q: '¿Cuánto es 9 x 3?', a: ['27', 'veintisiete'] },
  { q: '¿Cuánto es 15 - 6?', a: ['9', 'nueve'] },
  { q: '¿Cuánto es 8 x 8?', a: ['64', 'sesenta y cuatro'] },
  { q: '¿Cuánto es 100 / 10?', a: ['10', 'diez'] },

  { q: '¿Planeta rojo?', a: ['marte'] },
  { q: '¿Planeta más grande?', a: ['jupiter'] },
  { q: '¿Planeta más cercano al sol?', a: ['mercurio'] },
  { q: '¿Nuestro planeta?', a: ['tierra'] },
  { q: '¿Satélite natural de la Tierra?', a: ['luna'] },

  { q: '¿Color del cielo?', a: ['azul'] },
  { q: '¿Color de la sangre?', a: ['rojo'] },
  { q: '¿Color del pasto?', a: ['verde'] },
  { q: '¿Color del sol?', a: ['amarillo'] },
  { q: '¿Color del carbón?', a: ['negro'] },

  { q: '¿Animal que ladra?', a: ['perro'] },
  { q: '¿Animal que maúlla?', a: ['gato'] },
  { q: '¿Animal más grande del mundo?', a: ['ballena azul'] },
  { q: '¿Animal que vuela y canta?', a: ['pajaro', 'ave'] },
  { q: '¿Animal con trompa?', a: ['elefante'] },

  { q: '¿Idioma de Brasil?', a: ['portugues'] },
  { q: '¿Idioma de Perú?', a: ['espanol', 'castellano'] },
  { q: '¿Idioma de Francia?', a: ['frances'] },
  { q: '¿Idioma de Japón?', a: ['japones'] },
  { q: '¿Idioma de Alemania?', a: ['aleman'] },

  { q: '¿Día después del lunes?', a: ['martes'] },
  { q: '¿Primer día de la semana?', a: ['lunes'] },
  { q: '¿Último día de la semana?', a: ['domingo'] },
  { q: '¿Mes con 28 días?', a: ['febrero'] },
  { q: '¿Cuántos meses tiene el año?', a: ['12', 'doce'] },

  { q: '¿Quién pintó la Mona Lisa?', a: ['da vinci', 'leonardo da vinci'] },
  { q: '¿Autor de Harry Potter?', a: ['rowling', 'jk rowling', 'j k rowling'] },
  { q: '¿Creador de Facebook?', a: ['mark zuckerberg', 'zuckerberg'] },
  { q: '¿Fundador de Apple?', a: ['steve jobs', 'jobs'] },
  { q: '¿Creador de Microsoft?', a: ['bill gates', 'gates'] },

  { q: '¿Cuántos lados tiene un triángulo?', a: ['3', 'tres'] },
  { q: '¿Cuántos lados tiene un cuadrado?', a: ['4', 'cuatro'] },
  { q: '¿Cuántos lados tiene un pentágono?', a: ['5', 'cinco'] },
  { q: '¿Cuántos lados tiene un hexágono?', a: ['6', 'seis'] },
  { q: '¿Cuántos lados tiene un círculo?', a: ['0', 'cero', 'ninguno'] },

  { q: '¿Metal precioso amarillo?', a: ['oro'] },
  { q: '¿Metal usado en cables?', a: ['cobre'] },
  { q: '¿Gas que respiramos?', a: ['oxigeno'] },
  { q: '¿Gas que absorben las plantas?', a: ['dioxido de carbono', 'co2'] },
  { q: '¿Elemento del agua?', a: ['hidrogeno'] },

  { q: '¿Qué app es de mensajería verde?', a: ['whatsapp'] },
  { q: '¿App para fotos?', a: ['instagram'] },
  { q: '¿App de videos cortos?', a: ['tiktok'] },
  { q: '¿App de streaming?', a: ['netflix'] },
  { q: '¿Buscador más usado?', a: ['google'] },

  { q: '¿Juego de bloques famoso?', a: ['minecraft'] },
  { q: '¿Juego battle royale famoso?', a: ['fortnite'] },
  { q: '¿Juego de fútbol famoso?', a: ['fifa', 'ea sports fc'] },
  { q: '¿Fontanero de Nintendo?', a: ['mario', 'super mario'] },
  { q: '¿Erizo azul?', a: ['sonic'] },

  { q: '¿Protagonista de Naruto?', a: ['naruto'] },
  { q: '¿Protagonista de Dragon Ball?', a: ['goku'] },
  { q: '¿Protagonista de One Piece?', a: ['luffy'] },
  { q: '¿Pokémon amarillo?', a: ['pikachu'] },
  { q: '¿Cazador de titanes?', a: ['eren', 'eren jaeger', 'eren yeager'] }
];
preguntas.push(
  // 🌎 Geografía
  { q: '¿Capital de Colombia?', a: ['bogota'] },
  { q: '¿Capital de Ecuador?', a: ['quito'] },
  { q: '¿Capital de Bolivia?', a: ['sucre', 'la paz'] },
  { q: '¿Capital de Uruguay?', a: ['montevideo'] },
  { q: '¿Capital de Paraguay?', a: ['asuncion'] },
  { q: '¿Capital de Venezuela?', a: ['caracas'] },
  { q: '¿Capital de Brasil?', a: ['brasilia'] },
  { q: '¿Capital de Estados Unidos?', a: ['washington', 'washington dc'] },
  { q: '¿Capital de Canadá?', a: ['ottawa'] },
  { q: '¿Capital de Italia?', a: ['roma'] },
  { q: '¿Capital de Francia?', a: ['paris'] },
  { q: '¿Capital de Alemania?', a: ['berlin'] },
  { q: '¿Capital de Portugal?', a: ['lisboa'] },
  { q: '¿Capital de Japón?', a: ['tokio', 'tokyo'] },
  { q: '¿Capital de China?', a: ['pekin', 'beijing'] },
  { q: '¿Capital de Corea del Sur?', a: ['seul', 'seoul'] },
  { q: '¿Capital de Rusia?', a: ['moscu'] },
  { q: '¿Capital de Egipto?', a: ['el cairo', 'cairo'] },
  { q: '¿País donde está Machu Picchu?', a: ['peru'] },
  { q: '¿País donde está la Torre Eiffel?', a: ['francia'] },
  { q: '¿País donde está el Coliseo romano?', a: ['italia'] },
  { q: '¿País donde están las pirámides de Giza?', a: ['egipto'] },
  { q: '¿Continente donde está Perú?', a: ['america', 'america del sur', 'sudamerica'] },
  { q: '¿Océano más grande del mundo?', a: ['pacifico', 'oceano pacifico'] },
  { q: '¿Desierto más grande del mundo?', a: ['sahara', 'desierto del sahara'] },

  // 🧮 Matemáticas
  { q: '¿Cuánto es 6 + 6?', a: ['12', 'doce'] },
  { q: '¿Cuánto es 7 + 8?', a: ['15', 'quince'] },
  { q: '¿Cuánto es 20 - 9?', a: ['11', 'once'] },
  { q: '¿Cuánto es 14 + 6?', a: ['20', 'veinte'] },
  { q: '¿Cuánto es 12 x 2?', a: ['24', 'veinticuatro'] },
  { q: '¿Cuánto es 11 x 3?', a: ['33', 'treinta y tres'] },
  { q: '¿Cuánto es 10 x 10?', a: ['100', 'cien'] },
  { q: '¿Cuánto es 50 / 5?', a: ['10', 'diez'] },
  { q: '¿Cuánto es 81 / 9?', a: ['9', 'nueve'] },
  { q: '¿Cuánto es 3 al cuadrado?', a: ['9', 'nueve'] },
  { q: '¿Cuánto es 5 al cuadrado?', a: ['25', 'veinticinco'] },
  { q: '¿Número par después del 8?', a: ['10', 'diez'] },
  { q: '¿Número impar después del 7?', a: ['9', 'nueve'] },
  { q: '¿Cuántos minutos tiene una hora?', a: ['60', 'sesenta'] },
  { q: '¿Cuántos segundos tiene un minuto?', a: ['60', 'sesenta'] },

  // 🧪 Ciencia
  { q: '¿Qué órgano bombea la sangre?', a: ['corazon'] },
  { q: '¿Qué órgano usamos para respirar?', a: ['pulmones', 'pulmon'] },
  { q: '¿Qué órgano usamos para pensar?', a: ['cerebro'] },
  { q: '¿Qué parte del cuerpo usamos para ver?', a: ['ojos', 'ojo'] },
  { q: '¿Qué parte del cuerpo usamos para oír?', a: ['oidos', 'orejas', 'oido'] },
  { q: '¿Qué necesitan las plantas para hacer fotosíntesis?', a: ['luz', 'sol', 'luz solar'] },
  { q: '¿Qué líquido es vital para vivir?', a: ['agua'] },
  { q: '¿Qué gas respiramos principalmente para vivir?', a: ['oxigeno'] },
  { q: '¿Qué estrella ilumina la Tierra?', a: ['sol'] },
  { q: '¿Cómo se llama el cambio de líquido a gas?', a: ['evaporacion'] },
  { q: '¿Cómo se llama el cambio de agua a hielo?', a: ['congelacion'] },
  { q: '¿Qué fuerza nos mantiene pegados al suelo?', a: ['gravedad'] },
  { q: '¿Qué instrumento mide la temperatura?', a: ['termometro'] },
  { q: '¿Qué instrumento sirve para ver cosas muy pequeñas?', a: ['microscopio'] },
  { q: '¿Qué instrumento sirve para ver estrellas lejanas?', a: ['telescopio'] },

  // 🐾 Animales
  { q: '¿Animal conocido como rey de la selva?', a: ['leon'] },
  { q: '¿Animal que da leche?', a: ['vaca'] },
  { q: '¿Animal que pone huevos y cacarea?', a: ['gallina'] },
  { q: '¿Animal que relincha?', a: ['caballo'] },
  { q: '¿Animal que rebuzna?', a: ['burro', 'asno'] },
  { q: '¿Animal que tiene rayas negras y blancas?', a: ['cebra'] },
  { q: '¿Animal que cambia de color?', a: ['camaleon'] },
  { q: '¿Animal que tiene cuello muy largo?', a: ['jirafa'] },
  { q: '¿Animal que produce miel?', a: ['abeja'] },
  { q: '¿Animal que vive en una telaraña?', a: ['arana'] },
  { q: '¿Animal que salta y tiene bolsa?', a: ['canguro'] },
  { q: '¿Animal marino con ocho brazos?', a: ['pulpo'] },
  { q: '¿Animal que nada y tiene aletas?', a: ['pez'] },
  { q: '¿Ave que no puede volar y vive en zonas frías?', a: ['pinguino'] },
  { q: '¿Animal lento con caparazón?', a: ['tortuga'] },

  // 🍎 Comida
  { q: '¿Fruta amarilla que comen los monos?', a: ['platano', 'banana'] },
  { q: '¿Fruta roja asociada a Blancanieves?', a: ['manzana'] },
  { q: '¿Fruta verde por fuera y roja por dentro?', a: ['sandia'] },
  { q: '¿Fruta pequeña usada para hacer vino?', a: ['uva'] },
  { q: '¿Comida italiana redonda con queso?', a: ['pizza'] },
  { q: '¿Comida japonesa con arroz y pescado?', a: ['sushi'] },
  { q: '¿Bebida que se hace con cacao?', a: ['chocolate'] },
  { q: '¿Bebida caliente hecha con granos tostados?', a: ['cafe'] },
  { q: '¿Ingrediente principal del pan?', a: ['harina'] },
  { q: '¿Alimento blanco que viene de la vaca?', a: ['leche'] },

  // 🎬 Películas, series y personajes
  { q: '¿Superhéroe que usa telarañas?', a: ['spiderman', 'hombre arana'] },
  { q: '¿Superhéroe de Gotham?', a: ['batman'] },
  { q: '¿Superhéroe que viene de Krypton?', a: ['superman'] },
  { q: '¿Princesa de hielo de Frozen?', a: ['elsa'] },
  { q: '¿Muñeco vaquero de Toy Story?', a: ['woody'] },
  { q: '¿Robot pequeño de Wall-E?', a: ['wall e', 'walle'] },
  { q: '¿Ogro verde famoso?', a: ['shrek'] },
  { q: '¿Ratón famoso de Disney?', a: ['mickey', 'mickey mouse'] },
  { q: '¿Pato famoso de Disney?', a: ['donald', 'pato donald'] },
  { q: '¿León protagonista de El Rey León?', a: ['simba'] },
  { q: '¿Escuela de magia de Harry Potter?', a: ['hogwarts'] },
  { q: '¿Villano principal de Avengers Infinity War?', a: ['thanos'] },
  { q: '¿Robot amarillo de Transformers?', a: ['bumblebee'] },
  { q: '¿Película de autos con Rayo McQueen?', a: ['cars'] },
  { q: '¿Payaso enemigo de Batman?', a: ['joker', 'guason'] },

  // 🎮 Videojuegos
  { q: '¿Bloque explosivo de Minecraft?', a: ['tnt'] },
  { q: '¿Enemigo verde que explota en Minecraft?', a: ['creeper'] },
  { q: '¿Juego donde se construye con bloques?', a: ['minecraft'] },
  { q: '¿Juego famoso de disparos y construcción?', a: ['fortnite'] },
  { q: '¿Juego donde impostores eliminan tripulantes?', a: ['among us'] },
  { q: '¿Juego de fútbol de EA?', a: ['fifa', 'ea sports fc'] },
  { q: '¿Consola portátil de Nintendo muy famosa?', a: ['switch', 'nintendo switch'] },
  { q: '¿Pokémon inicial de tipo fuego de Kanto?', a: ['charmander'] },
  { q: '¿Pokémon inicial de tipo agua de Kanto?', a: ['squirtle'] },
  { q: '¿Pokémon inicial de tipo planta de Kanto?', a: ['bulbasaur'] },

  // 📱 Tecnología
  { q: '¿Sistema operativo de iPhone?', a: ['ios'] },
  { q: '¿Sistema operativo de muchos celulares Samsung?', a: ['android'] },
  { q: '¿Red social de videos cortos?', a: ['tiktok'] },
  { q: '¿Red social de fotos y reels?', a: ['instagram'] },
  { q: '¿Aplicación de mensajes con logo verde?', a: ['whatsapp'] },
  { q: '¿Plataforma para ver videos largos?', a: ['youtube'] },
  { q: '¿Servicio de música con logo verde?', a: ['spotify'] },
  { q: '¿Empresa creadora de Windows?', a: ['microsoft'] },
  { q: '¿Empresa creadora del iPhone?', a: ['apple'] },
  { q: '¿Empresa creadora de Android?', a: ['google'] },

  // 🏆 Deportes
  { q: '¿Deporte más popular del mundo?', a: ['futbol'] },
  { q: '¿Cuántos jugadores tiene un equipo de fútbol en cancha?', a: ['11', 'once'] },
  { q: '¿Deporte donde se usa una raqueta y una pelota amarilla?', a: ['tenis'] },
  { q: '¿Deporte donde se encesta una pelota?', a: ['basquet', 'basket', 'baloncesto'] },
  { q: '¿Deporte donde se nada en piscina?', a: ['natacion'] },
  { q: '¿Evento deportivo mundial cada 4 años?', a: ['mundial', 'copa mundial', 'mundial de futbol'] },
  { q: '¿Color de tarjeta para expulsión en fútbol?', a: ['roja', 'tarjeta roja'] },
  { q: '¿Color de tarjeta de advertencia en fútbol?', a: ['amarilla', 'tarjeta amarilla'] },
  { q: '¿Objeto que se patea en fútbol?', a: ['pelota', 'balon'] },
  { q: '¿Lugar donde se juega fútbol?', a: ['cancha', 'campo', 'estadio'] },

  // 🎵 Música
  { q: '¿Instrumento con teclas blancas y negras?', a: ['piano'] },
  { q: '¿Instrumento de seis cuerdas?', a: ['guitarra'] },
  { q: '¿Instrumento que se toca con baquetas?', a: ['bateria', 'tambor'] },
  { q: '¿Persona que canta?', a: ['cantante'] },
  { q: '¿Persona que toca música con mezclas?', a: ['dj'] },
  { q: '¿Género musical popular de Puerto Rico?', a: ['reggaeton'] },
  { q: '¿Canción sin voz, solo música?', a: ['instrumental'] },
  { q: '¿Disco con varias canciones?', a: ['album'] },
  { q: '¿Aplicación famosa para escuchar música?', a: ['spotify'] },
  { q: '¿Instrumento pequeño que se sopla y tiene agujeros?', a: ['flauta'] },

  // 📚 Cultura general
  { q: '¿Cuántas letras tiene el abecedario español?', a: ['27', 'veintisiete'] },
  { q: '¿Primera letra del abecedario?', a: ['a'] },
  { q: '¿Última letra del abecedario?', a: ['z'] },
  { q: '¿Cuántas horas tiene un día?', a: ['24', 'veinticuatro'] },
  { q: '¿Cuántos días tiene una semana?', a: ['7', 'siete'] },
  { q: '¿Cuántos días tiene un año normal?', a: ['365', 'trescientos sesenta y cinco'] },
  { q: '¿Qué usamos para escribir en papel?', a: ['lapiz', 'lapicero', 'pluma', 'boligrafo'] },
  { q: '¿Lugar donde se estudia?', a: ['colegio', 'escuela', 'universidad'] },
  { q: '¿Lugar donde se compran medicinas?', a: ['farmacia'] },
  { q: '¿Lugar donde se compran alimentos?', a: ['mercado', 'supermercado', 'tienda'] },

  // 🇵🇪 Perú
  { q: '¿Capital del Perú?', a: ['lima'] },
  { q: '¿Moneda del Perú?', a: ['sol', 'nuevo sol', 'soles'] },
  { q: '¿Comida peruana con pescado y limón?', a: ['ceviche', 'cebiche'] },
  { q: '¿Bebida peruana morada?', a: ['chicha morada'] },
  { q: '¿Inca famoso asociado a Machu Picchu?', a: ['pachacutec'] },
  { q: '¿Baile típico peruano con pañuelo?', a: ['marinera'] },
  { q: '¿Animal andino usado para cargar cosas?', a: ['llama'] },
  { q: '¿Ave símbolo del escudo peruano?', a: ['vicuña', 'vicuna'] },
  { q: '¿Ciudad peruana conocida como Ciudad Blanca?', a: ['arequipa'] },
  { q: '¿Lago compartido por Perú y Bolivia?', a: ['titicaca', 'lago titicaca'] },

  // 😹 Preguntas random/divertidas
  { q: '¿Qué animal dice miau?', a: ['gato'] },
  { q: '¿Qué animal dice guau?', a: ['perro'] },
  { q: '¿Qué emoji representa risa con lágrimas?', a: ['😂', 'carita llorando de risa', 'risa'] },
  { q: '¿Qué se usa para tomar fotos?', a: ['camara', 'celular'] },
  { q: '¿Qué se usa para llamar por teléfono?', a: ['celular', 'telefono'] },
  { q: '¿Qué se prende cuando está oscuro?', a: ['luz', 'linterna', 'foco'] },
  { q: '¿Qué se abre para entrar a una casa?', a: ['puerta'] },
  { q: '¿Qué se usa para dormir?', a: ['cama'] },
  { q: '¿Qué usamos cuando llueve?', a: ['paraguas'] },
  { q: '¿Qué usamos para ver la hora?', a: ['reloj', 'celular'] }
);

function getQuestion() {
  if (used.size >= preguntas.length) {
    used.clear();
  }

  let index;

  do {
    index = Math.floor(Math.random() * preguntas.length);
  } while (used.has(index));

  used.add(index);

  const item = preguntas[index];

  return {
    q: item.q,
    answers: item.a.map(normalize)
  };
}

function start(chatId, timeout = null) {
  if (current) return null;

  const q = getQuestion();

  current = {
    chat: chatId,
    question: q.q,
    answers: q.answers,
    answer: q.answers[0],
    active: true,
    startedAt: Date.now(),
    timeout
  };

  return current;
}

function next() {
  if (!current) return null;

  const q = getQuestion();

  current.question = q.q;
  current.answers = q.answers;
  current.answer = q.answers[0];
  current.startedAt = Date.now();

  return current;
}

function stop() {
  if (current?.timeout) clearTimeout(current.timeout);
  current = null;
}

function get() {
  return current;
}

function check(text = '') {
  if (!current) return false;

  const userText = normalize(text);

  return current.answers.some(answer => {
    if (!answer) return false;
    return userText === answer || userText.includes(answer);
  });
}

function forceSet(data = {}) {
  current = {
    chat: data.chat || null,
    question: data.question || '',
    answers: Array.isArray(data.answers)
      ? data.answers.map(normalize)
      : [normalize(data.answer || '')],
    answer: normalize(data.answer || ''),
    active: true,
    startedAt: Date.now(),
    timeout: data.timeout || null
  };

  return current;
}

module.exports = {
  preguntas,
  normalize,
  start,
  next,
  stop,
  get,
  check,
  forceSet
};
