'use strict';

let current = null;
let used = new Set();

// 🔥 NORMALIZAR TEXTO (clave para que no falle)
function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")                 // quita acentos
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")      // quita símbolos
    .trim();
}

// 🔥 PREGUNTAS (puedes dejar tus 100 aquí)
const preguntas = [
  { q: '¿Capital de Perú?', a: 'lima' },
  { q: '¿Capital de México?', a: 'ciudad de mexico' },
  { q: '¿Capital de España?', a: 'madrid' },
  { q: '¿Capital de Argentina?', a: 'buenos aires' },
  { q: '¿Capital de Chile?', a: 'santiago' },

  { q: '¿Cuánto es 5 + 7?', a: '12' },
  { q: '¿Cuánto es 9 x 3?', a: '27' },
  { q: '¿Cuánto es 15 - 6?', a: '9' },
  { q: '¿Cuánto es 8 x 8?', a: '64' },
  { q: '¿Cuánto es 100 / 10?', a: '10' },

  { q: '¿Planeta rojo?', a: 'marte' },
  { q: '¿Planeta más grande?', a: 'jupiter' },
  { q: '¿Planeta más cercano al sol?', a: 'mercurio' },
  { q: '¿Nuestro planeta?', a: 'tierra' },
  { q: '¿Satélite natural de la Tierra?', a: 'luna' },

  { q: '¿Color del cielo?', a: 'azul' },
  { q: '¿Color de la sangre?', a: 'rojo' },
  { q: '¿Color del pasto?', a: 'verde' },
  { q: '¿Color del sol?', a: 'amarillo' },
  { q: '¿Color del carbón?', a: 'negro' },

  { q: '¿Animal que ladra?', a: 'perro' },
  { q: '¿Animal que maúlla?', a: 'gato' },
  { q: '¿Animal más grande del mundo?', a: 'ballena azul' },
  { q: '¿Animal que vuela y canta?', a: 'pajaro' },
  { q: '¿Animal con trompa?', a: 'elefante' },

  { q: '¿Idioma de Brasil?', a: 'portugues' },
  { q: '¿Idioma de Perú?', a: 'español' },
  { q: '¿Idioma de Francia?', a: 'frances' },
  { q: '¿Idioma de Japón?', a: 'japones' },
  { q: '¿Idioma de Alemania?', a: 'aleman' },

  { q: '¿Día después del lunes?', a: 'martes' },
  { q: '¿Primer día de la semana?', a: 'lunes' },
  { q: '¿Último día de la semana?', a: 'domingo' },
  { q: '¿Mes con 28 días?', a: 'febrero' },
  { q: '¿Cuántos meses tiene el año?', a: '12' },

  { q: '¿Quién pintó la Mona Lisa?', a: 'da vinci' },
  { q: '¿Autor de Harry Potter?', a: 'rowling' },
  { q: '¿Creador de Facebook?', a: 'mark zuckerberg' },
  { q: '¿Fundador de Apple?', a: 'steve jobs' },
  { q: '¿Creador de Microsoft?', a: 'bill gates' },

  { q: '¿Cuántos lados tiene un triángulo?', a: '3' },
  { q: '¿Cuántos lados tiene un cuadrado?', a: '4' },
  { q: '¿Cuántos lados tiene un pentágono?', a: '5' },
  { q: '¿Cuántos lados tiene un hexágono?', a: '6' },
  { q: '¿Cuántos lados tiene un círculo?', a: '0' },

  { q: '¿Metal precioso amarillo?', a: 'oro' },
  { q: '¿Metal usado en cables?', a: 'cobre' },
  { q: '¿Gas que respiramos?', a: 'oxigeno' },
  { q: '¿Gas de las plantas?', a: 'dioxido de carbono' },
  { q: '¿Elemento del agua?', a: 'hidrogeno' },

  { q: '¿Qué app es de mensajería verde?', a: 'whatsapp' },
  { q: '¿App para fotos?', a: 'instagram' },
  { q: '¿App de videos cortos?', a: 'tiktok' },
  { q: '¿App de streaming?', a: 'netflix' },
  { q: '¿Buscador más usado?', a: 'google' },

  { q: '¿Juego de bloques famoso?', a: 'minecraft' },
  { q: '¿Juego battle royale famoso?', a: 'fortnite' },
  { q: '¿Juego de fútbol famoso?', a: 'fifa' },
  { q: '¿Fontanero de Nintendo?', a: 'mario' },
  { q: '¿Erizo azul?', a: 'sonic' },

  { q: '¿Protagonista de Naruto?', a: 'naruto' },
  { q: '¿Protagonista de Dragon Ball?', a: 'goku' },
  { q: '¿Protagonista de One Piece?', a: 'luffy' },
  { q: '¿Pokémon amarillo?', a: 'pikachu' },
  { q: '¿Cazador de titanes?', a: 'eren' },

  { q: '¿Continente de Perú?', a: 'america' },
  { q: '¿Continente de España?', a: 'europa' },
  { q: '¿Continente de Japón?', a: 'asia' },
  { q: '¿Continente de Egipto?', a: 'africa' },
  { q: '¿Continente de Australia?', a: 'oceania' },

  { q: '¿Cuántos continentes hay?', a: '5' },
  { q: '¿Cuántos días tiene un año normal?', a: '365' },
  { q: '¿Cuántas horas tiene un día?', a: '24' },
  { q: '¿Cuántos minutos tiene una hora?', a: '60' },
  { q: '¿Cuántos segundos tiene un minuto?', a: '60' },

  { q: '¿Instrumento con teclas blanco y negro?', a: 'piano' },
  { q: '¿Instrumento de cuerdas?', a: 'guitarra' },
  { q: '¿Instrumento que se sopla?', a: 'flauta' },
  { q: '¿Instrumento de percusión?', a: 'bateria' },
  { q: '¿Instrumento clásico de violín grande?', a: 'violonchelo' },

  { q: '¿Bebida caliente popular?', a: 'cafe' },
  { q: '¿Bebida hecha de hojas?', a: 'te' },
  { q: '¿Comida italiana famosa?', a: 'pizza' },
  { q: '¿Comida japonesa famosa?', a: 'sushi' },
  { q: '¿Comida rápida con pan?', a: 'hamburguesa' },

  { q: '¿Red social del pajarito azul?', a: 'twitter' },
  { q: '¿App de chats gamers?', a: 'discord' },
  { q: '¿Plataforma de videos?', a: 'youtube' },
  { q: '¿Sistema operativo de iPhone?', a: 'ios' },
  { q: '¿Sistema operativo de Android?', a: 'android' },

  { q: '¿Moneda de Estados Unidos?', a: 'dolar' },
  { q: '¿Moneda de Perú?', a: 'sol' },
  { q: '¿Moneda de Europa?', a: 'euro' },
  { q: '¿Moneda de Japón?', a: 'yen' },
  { q: '¿Moneda de México?', a: 'peso' },

  { q: '¿Parte del cuerpo para ver?', a: 'ojos' },
  { q: '¿Parte del cuerpo para oír?', a: 'oidos' },
  { q: '¿Parte del cuerpo para pensar?', a: 'cerebro' },
  { q: '¿Parte del cuerpo para respirar?', a: 'pulmones' },
  { q: '¿Parte del cuerpo para latir?', a: 'corazon' }
];

// elegir sin repetir
function getQuestion() {
  const disponibles = preguntas.filter((_, i) => !used.has(i));

  if (disponibles.length === 0) {
    used.clear();
    return getQuestion();
  }

  const index = Math.floor(Math.random() * disponibles.length);
  const realIndex = preguntas.indexOf(disponibles[index]);

  used.add(realIndex);
  return preguntas[realIndex];
}

module.exports = {

  start(chatId) {
    if (current) return null;

    const q = getQuestion();

    current = {
      chat: chatId,
      question: q.q,
      answer: q.a,
      normalized: normalize(q.a),
      active: true
    };

    return current;
  },

  stop() {
    current = null;
  },

  get() {
    return current;
  },

  // 🔥 DETECCIÓN FLEXIBLE
  check(text) {
    if (!current) return false;

    const userText = normalize(text);

    // permite: "creo que es lima"
    return userText.includes(current.normalized);
  }
};
