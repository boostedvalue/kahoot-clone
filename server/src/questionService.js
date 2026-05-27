const CATEGORIES = {
  'conocimiento-general': { id: 9, name: 'Conocimiento General' },
  'ciencia': { id: 17, name: 'Ciencia y Naturaleza' },
  'historia': { id: 23, name: 'Historia' },
  'geografia': { id: 22, name: 'Geografía' },
  'deportes': { id: 21, name: 'Deportes' },
  'entretenimiento': { id: 11, name: 'Cine y TV' },
  'musica': { id: 12, name: 'Música' },
  'videojuegos': { id: 15, name: 'Videojuegos' },
  'arte': { id: 25, name: 'Arte y Literatura' },
  'animales': { id: 27, name: 'Animales' },
};

const DIFFICULTY_MAP = {
  'facil': 'easy',
  'medio': 'medium',
  'algo-dificil': 'medium',
  'super-dificil': 'hard',
};

const DIFFICULTY_SPANISH = {
  'easy': 'Fácil',
  'medium': 'Medio',
  'hard': 'Difícil',
};

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function decodeHtmlEntities(text) {
  const entities = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#039;': "'", '&rsquo;': "'", '&lsquo;': "'", '&mdash;': '—',
    '&ndash;': '–', '&eacute;': 'é', '&aacute;': 'á', '&iacute;': 'í',
    '&oacute;': 'ó', '&uacute;': 'ú', '&ntilde;': 'ñ', '&Eacute;': 'É',
    '&Aacute;': 'Á', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú',
    '&Ntilde;': 'Ñ', '&uuml;': 'ü', '&Uuml;': 'Ü',
  };
  return text.replace(/&[^;]+;/g, match => entities[match] || match);
}

function formatQuestion(q) {
  const options = shuffleArray([
    { text: decodeHtmlEntities(q.correct_answer), correct: true },
    ...q.incorrect_answers.map(a => ({ text: decodeHtmlEntities(a), correct: false })),
  ]);
  return {
    question: decodeHtmlEntities(q.question),
    options,
    category: q.category,
    difficulty: DIFFICULTY_SPANISH[q.difficulty] || q.difficulty,
  };
}

async function fetchFromOpenTrivia(amount, difficulty, categoryId) {
  const diff = DIFFICULTY_MAP[difficulty] || 'medium';
  const url = `https://opentdb.com/api.php?amount=${amount}&category=${categoryId}&difficulty=${diff}&type=multiple`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.response_code !== 0 || !data.results.length) {
    throw new Error('Open Trivia DB returned no results');
  }
  return data.results.map(formatQuestion);
}

async function fetchFallbackQuestions(amount, topic, difficulty) {
  const fallbackPool = {
    'conocimiento-general': [
      { q: '¿Cuál es el planeta más grande del sistema solar?', opts: ['Júpiter', 'Saturno', 'Neptuno', 'Urano'], correct: 0 },
      { q: '¿En qué año llegó el hombre a la luna?', opts: ['1969', '1965', '1972', '1961'], correct: 0 },
      { q: '¿Cuál es el río más largo del mundo?', opts: ['Amazonas', 'Nilo', 'Misisipi', 'Yangtsé'], correct: 1 },
      { q: '¿Quién pintó la Mona Lisa?', opts: ['Leonardo da Vinci', 'Miguel Ángel', 'Rafael', 'Donatello'], correct: 0 },
      { q: '¿Cuál es el océano más grande?', opts: ['Pacífico', 'Atlántico', 'Índico', 'Ártico'], correct: 0 },
      { q: '¿Cuántos huesos tiene el cuerpo humano adulto?', opts: ['206', '201', '195', '212'], correct: 0 },
      { q: '¿Cuál es la capital de Australia?', opts: ['Canberra', 'Sídney', 'Melbourne', 'Brisbane'], correct: 0 },
      { q: '¿Qué instrumento mide la temperatura?', opts: ['Termómetro', 'Barómetro', 'Hidrómetro', 'Cronómetro'], correct: 0 },
      { q: '¿Cuántos lados tiene un hexágono?', opts: ['6', '5', '7', '8'], correct: 0 },
      { q: '¿Cuál es el idioma más hablado del mundo?', opts: ['Chino mandarín', 'Inglés', 'Español', 'Hindi'], correct: 0 },
      { q: '¿Quién escribió "Cien años de soledad"?', opts: ['Gabriel García Márquez', 'Mario Vargas Llosa', 'Jorge Luis Borges', 'Pablo Neruda'], correct: 0 },
      { q: '¿Cuál es la montaña más alta del mundo?', opts: ['Everest', 'K2', 'Kangchenjunga', 'Lhotse'], correct: 0 },
      { q: '¿Qué gas respiramos principalmente?', opts: ['Nitrógeno', 'Oxígeno', 'Dióxido de carbono', 'Argón'], correct: 0 },
      { q: '¿En qué continente está Egipto?', opts: ['África', 'Asia', 'Europa', 'América'], correct: 0 },
      { q: '¿Cuántos minutos tiene una hora?', opts: ['60', '100', '30', '45'], correct: 0 },
    ],
    'ciencia': [
      { q: '¿Cuál es el elemento químico más abundante en el universo?', opts: ['Hidrógeno', 'Helio', 'Oxígeno', 'Carbono'], correct: 0 },
      { q: '¿Qué órgano del cuerpo humano bombea sangre?', opts: ['Corazón', 'Pulmón', 'Hígado', 'Riñón'], correct: 0 },
      { q: '¿Cuánto tarda la luz del sol en llegar a la Tierra?', opts: ['8 minutos', '1 minuto', '30 minutos', '1 hora'], correct: 0 },
      { q: '¿Cuál es la velocidad de la luz?', opts: ['300,000 km/s', '150,000 km/s', '500,000 km/s', '100,000 km/s'], correct: 0 },
      { q: '¿Qué planeta es conocido como el "planeta rojo"?', opts: ['Marte', 'Venus', 'Júpiter', 'Saturno'], correct: 0 },
      { q: '¿Cuál es la unidad básica de la vida?', opts: ['Célula', 'ADN', 'Tejido', 'Órgano'], correct: 0 },
      { q: '¿Qué tipo de animal es el delfín?', opts: ['Mamífero', 'Pez', 'Reptil', 'Anfibio'], correct: 0 },
      { q: '¿Cuál es el proceso por el cual las plantas producen alimento?', opts: ['Fotosíntesis', 'Respiración', 'Digestión', 'Fermentación'], correct: 0 },
      { q: '¿Cuántos huesos tiene el cráneo humano?', opts: ['22', '12', '32', '8'], correct: 0 },
      { q: '¿Cuál es la fórmula del agua?', opts: ['H2O', 'CO2', 'NaCl', 'O2'], correct: 0 },
    ],
    'historia': [
      { q: '¿En qué año comenzó la Segunda Guerra Mundial?', opts: ['1939', '1914', '1941', '1937'], correct: 0 },
      { q: '¿Quién fue el primer presidente de Estados Unidos?', opts: ['George Washington', 'Thomas Jefferson', 'Abraham Lincoln', 'John Adams'], correct: 0 },
      { q: '¿Qué imperio construyó el Coliseo Romano?', opts: ['Imperio Romano', 'Imperio Griego', 'Imperio Egipcio', 'Imperio Persa'], correct: 0 },
      { q: '¿Quién descubrió América?', opts: ['Cristóbal Colón', 'Vasco da Gama', 'Fernando de Magallanes', 'Américo Vespucio'], correct: 0 },
      { q: '¿Cuál fue la primera civilización conocida?', opts: ['Sumeria', 'Egipcia', 'India', 'China'], correct: 0 },
      { q: '¿En qué año cayó el Muro de Berlín?', opts: ['1989', '1991', '1985', '1993'], correct: 0 },
      { q: '¿Quién fue el líder de la Revolución Cubana?', opts: ['Fidel Castro', 'Che Guevara', 'Camilo Cienfuegos', 'Raúl Castro'], correct: 0 },
      { q: '¿Cuál era la capital del Imperio Inca?', opts: ['Cusco', 'Lima', 'Quito', 'Machu Picchu'], correct: 0 },
      { q: '¿En qué año se firmó la Declaración de Independencia de Estados Unidos?', opts: ['1776', '1783', '1775', '1789'], correct: 0 },
      { q: '¿Quién fue el primer emperador de China?', opts: ['Qin Shi Huang', 'Kublai Khan', 'Sun Tzu', 'Confucio'], correct: 0 },
    ],
  };

  const pool = fallbackPool[topic] || fallbackPool['conocimiento-general'];
  const shuffled = shuffleArray(pool);
  const selected = shuffled.slice(0, Math.min(amount, pool.length));

  return selected.map(item => ({
    question: item.q,
    options: shuffleArray(item.opts.map((text, i) => ({
      text,
      correct: i === item.correct,
    }))),
    category: CATEGORIES[topic]?.name || 'General',
    difficulty: DIFFICULTY_SPANISH[DIFFICULTY_MAP[difficulty]] || 'Medio',
  }));
}

export async function fetchQuestions(amount, topic, difficulty) {
  const category = CATEGORIES[topic];
  if (category) {
    try {
      const questions = await fetchFromOpenTrivia(amount, difficulty, category.id);
      return questions;
    } catch (err) {
      console.log('Open Trivia DB failed, using fallback:', err.message);
    }
  }
  return fetchFallbackQuestions(amount, topic, difficulty);
}

export { CATEGORIES };
