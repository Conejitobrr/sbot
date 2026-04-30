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
