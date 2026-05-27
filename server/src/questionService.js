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
  return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'").replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&eacute;/g, 'é').replace(/&aacute;/g, 'á').replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
    .replace(/&Eacute;/g, 'É').replace(/&Aacute;/g, 'Á').replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó').replace(/&Uacute;/g, 'Ú').replace(/&Ntilde;/g, 'Ñ')
    .replace(/&uuml;/g, 'ü').replace(/&Uuml;/g, 'Ü');
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

async function translateText(text, retries = 2) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(text)}`;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data && data[0]) {
        return data[0].map(segment => segment[0]).join('');
      }
    } catch (e) {
      if (i === retries - 1) throw e;
    }
  }
  return text;
}

async function translateQuestions(questions) {
  const batchSize = 5;
  const translated = [];
  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(async (q) => {
      try {
        const [questionText, ...optionsTexts] = await Promise.all([
          translateText(q.question),
          ...q.options.map(o => translateText(o.text)),
        ]);
        return {
          ...q,
          question: questionText,
          options: q.options.map((o, idx) => ({ ...o, text: optionsTexts[idx] })),
          category: q.category,
        };
      } catch {
        return q;
      }
    }));
    translated.push(...results);
  }
  return translated;
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

function formatFallback(item, topic, difficulty) {
  return {
    question: item.q,
    options: shuffleArray(item.opts.map((text, i) => ({
      text,
      correct: i === item.correct,
    }))),
    category: CATEGORIES[topic]?.name || 'General',
    difficulty: DIFFICULTY_SPANISH[DIFFICULTY_MAP[difficulty]] || 'Medio',
  };
}

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
    { q: '¿Cuál es el país más poblado del mundo?', opts: ['India', 'China', 'Estados Unidos', 'Indonesia'], correct: 0 },
    { q: '¿Quién escribió "Don Quijote de la Mancha"?', opts: ['Miguel de Cervantes', 'Lope de Vega', 'Calderón de la Barca', 'Garcilaso de la Vega'], correct: 0 },
    { q: '¿Cuál es el animal más rápido del mundo?', opts: ['Guepardo', 'León', 'Tigre', 'Caballo'], correct: 0 },
    { q: '¿Qué planeta es conocido como el "planeta rojo"?', opts: ['Marte', 'Venus', 'Júpiter', 'Saturno'], correct: 0 },
    { q: '¿Cuál es la capital de Francia?', opts: ['París', 'Londres', 'Madrid', 'Berlín'], correct: 0 },
    { q: '¿Cuál es la comida más consumida del mundo?', opts: ['Arroz', 'Trigo', 'Maíz', 'Papa'], correct: 0 },
    { q: '¿Cuántos días tiene un año bisiesto?', opts: ['366', '365', '364', '360'], correct: 0 },
    { q: '¿Cuál es la moneda oficial de Japón?', opts: ['Yen', 'Dólar', 'Euro', 'Won'], correct: 0 },
    { q: '¿Qué fenómeno natural causa la erosión del viento?', opts: ['Erosión eólica', 'Erosión hídrica', 'Erosión glaciar', 'Erosión química'], correct: 0 },
    { q: '¿Cuál es el volcán más activo del mundo?', opts: ['Kilauea', 'Monte Vesubio', 'Monte Etna', 'Mauna Loa'], correct: 0 },
    { q: '¿Quién fue el primer hombre en pisar la luna?', opts: ['Neil Armstrong', 'Buzz Aldrin', 'Yuri Gagarin', 'John Glenn'], correct: 0 },
    { q: '¿Cuál es el edificio más alto del mundo?', opts: ['Burj Khalifa', 'Shanghai Tower', 'Abraj Al-Bait', 'One World Trade Center'], correct: 0 },
    { q: '¿Qué año se inventó la imprenta?', opts: ['1440', '1492', '1400', '1500'], correct: 0 },
    { q: '¿Cuál es la velocidad del sonido?', opts: ['343 m/s', '300 m/s', '400 m/s', '500 m/s'], correct: 0 },
    { q: '¿Cuántos satélites naturales tiene la Tierra?', opts: ['1', '2', '0', '3'], correct: 0 },
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
    { q: '¿Qué planeta es el más cercano al Sol?', opts: ['Mercurio', 'Venus', 'Tierra', 'Marte'], correct: 0 },
    { q: '¿Cuántos cromosomas tiene el ser humano?', opts: ['46', '44', '48', '42'], correct: 0 },
    { q: '¿Qué científico propuso la teoría de la relatividad?', opts: ['Albert Einstein', 'Isaac Newton', 'Galileo Galilei', 'Stephen Hawking'], correct: 0 },
    { q: '¿Cuál es el animal más rápido del mundo?', opts: ['Halcón peregrino', 'Guepardo', 'Pez vela', 'Avestruz'], correct: 0 },
    { q: '¿Qué gas produce el efecto invernadero?', opts: ['Dióxido de carbono', 'Oxígeno', 'Nitrógeno', 'Hidrógeno'], correct: 0 },
    { q: '¿Cuál es la temperatura de ebullición del agua?', opts: ['100°C', '90°C', '110°C', '80°C'], correct: 0 },
    { q: '¿Qué órgano produce insulina?', opts: ['Páncreas', 'Hígado', 'Riñón', 'Estómago'], correct: 0 },
    { q: '¿Cuál es la partícula más pequeña de un elemento?', opts: ['Átomo', 'Protón', 'Electrón', 'Molécula'], correct: 0 },
    { q: '¿Qué científico descubrió la penicilina?', opts: ['Alexander Fleming', 'Louis Pasteur', 'Robert Koch', 'Joseph Lister'], correct: 0 },
    { q: '¿Cuál es el hueso más largo del cuerpo humano?', opts: ['Fémur', 'Tibia', 'Húmero', 'Columna'], correct: 0 },
    { q: '¿Cuántos dientes tiene un adulto promedio?', opts: ['32', '28', '30', '34'], correct: 0 },
    { q: '¿Cuál es el metal más abundante en la corteza terrestre?', opts: ['Aluminio', 'Hierro', 'Cobre', 'Oro'], correct: 0 },
    { q: '¿Qué planeta tiene anillos visibles?', opts: ['Saturno', 'Júpiter', 'Urano', 'Neptuno'], correct: 0 },
    { q: '¿Cuál es la ciencia que estudia los fósiles?', opts: ['Paleontología', 'Arqueología', 'Geología', 'Antropología'], correct: 0 },
    { q: '¿Qué vitamina produce el sol en la piel?', opts: ['Vitamina D', 'Vitamina C', 'Vitamina A', 'Vitamina B'], correct: 0 },
    { q: '¿Cuántos litros de sangre tiene el cuerpo humano?', opts: ['5 litros', '3 litros', '7 litros', '10 litros'], correct: 0 },
    { q: '¿Qué tipo de roca se forma por enfriamiento del magma?', opts: ['Ígnea', 'Sedimentaria', 'Metamórfica', 'Volcánica'], correct: 0 },
    { q: '¿Cuántos sentidos tiene el ser humano tradicionalmente?', opts: ['5', '6', '7', '4'], correct: 0 },
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
    { q: '¿En qué año terminó la Primera Guerra Mundial?', opts: ['1918', '1917', '1919', '1916'], correct: 0 },
    { q: '¿Quién fue el último faraón de Egipto?', opts: ['Cleopatra', 'Nefertiti', 'Tutankamón', 'Ramsés II'], correct: 0 },
    { q: '¿Qué civilización construyó Machu Picchu?', opts: ['Inca', 'Maya', 'Azteca', 'Olmeca'], correct: 0 },
    { q: '¿Quién fue el primer emperador romano?', opts: ['Augusto', 'Julio César', 'Nerón', 'Trajano'], correct: 0 },
    { q: '¿En qué año comenzó la Revolución Francesa?', opts: ['1789', '1776', '1799', '1804'], correct: 0 },
    { q: '¿Qué país ganó la primera Guerra Mundial?', opts: ['Francia', 'Alemania', 'Inglaterra', 'Rusia'], correct: 0 },
    { q: '¿Cuánto duró la Guerra de los Cien Años?', opts: ['116 años', '100 años', '84 años', '150 años'], correct: 0 },
    { q: '¿Quién fue el primer presidente de México?', opts: ['Guadalupe Victoria', 'Benito Juárez', 'Porfirio Díaz', 'Miguel Hidalgo'], correct: 0 },
    { q: '¿En qué año se descubrió América?', opts: ['1492', '1500', '1480', '1510'], correct: 0 },
    { q: '¿Qué pueblo construyó las pirámides de Egipto?', opts: ['Egipcios', 'Mayas', 'Aztecas', 'Sumérios'], correct: 0 },
  ],
  'geografia': [
    { q: '¿Cuál es el país más grande del mundo?', opts: ['Rusia', 'Canadá', 'China', 'Estados Unidos'], correct: 0 },
    { q: '¿Cuál es la capital de Francia?', opts: ['París', 'Londres', 'Madrid', 'Berlín'], correct: 0 },
    { q: '¿Cuál es el desierto más grande del mundo?', opts: ['Sahara', 'Gobi', 'Kalahari', 'Atacama'], correct: 0 },
    { q: '¿Cuál es la capital de Japón?', opts: ['Tokio', 'Kioto', 'Osaka', 'Yokohama'], correct: 0 },
    { q: '¿Cuántos países hay en América del Sur?', opts: ['12', '10', '13', '15'], correct: 0 },
    { q: '¿Cuál es el lago más grande del mundo?', opts: ['Caspio', 'Superior', 'Victoria', 'Baikal'], correct: 0 },
    { q: '¿Dónde se encuentra la Torre Eiffel?', opts: ['París', 'Londres', 'Roma', 'Berlín'], correct: 0 },
    { q: '¿Cuál es la capital de Argentina?', opts: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza'], correct: 0 },
    { q: '¿Qué río atraviesa Londres?', opts: ['Támesis', 'Sena', 'Danubio', 'Rin'], correct: 0 },
    { q: '¿Cuál es el país más pequeño del mundo?', opts: ['Vaticano', 'Mónaco', 'San Marino', 'Liechtenstein'], correct: 0 },
    { q: '¿En qué continente está Brasil?', opts: ['América del Sur', 'América del Norte', 'África', 'Europa'], correct: 0 },
    { q: '¿Cuál es la capital de Australia?', opts: ['Canberra', 'Sídney', 'Melbourne', 'Brisbane'], correct: 0 },
    { q: '¿Cuál es la montaña más alta de América?', opts: ['Aconcagua', 'Denali', 'Ojos del Salado', 'Chimborazo'], correct: 0 },
    { q: '¿Dónde se encuentra el río Amazonas?', opts: ['América del Sur', 'África', 'Asia', 'América del Norte'], correct: 0 },
    { q: '¿Cuál es la capital de Italia?', opts: ['Roma', 'Milán', 'Nápoles', 'Turín'], correct: 0 },
    { q: '¿Qué país tiene forma de bota?', opts: ['Italia', 'España', 'Portugal', 'Grecia'], correct: 0 },
    { q: '¿Cuál es el océano más pequeño?', opts: ['Ártico', 'Antártico', 'Índico', 'Pacífico'], correct: 0 },
    { q: '¿Cuántos continentes hay?', opts: ['7', '5', '6', '8'], correct: 0 },
  ],
  'deportes': [
    { q: '¿Cuántos jugadores tiene un equipo de fútbol?', opts: ['11', '9', '7', '5'], correct: 0 },
    { q: '¿En qué deporte se usa un cesto?', opts: ['Baloncesto', 'Fútbol', 'Tenis', 'Béisbol'], correct: 0 },
    { q: '¿Quién es considerado el mejor futbolista de la historia?', opts: ['Maradona', 'Pelé', 'Messi', 'Cristiano Ronaldo'], correct: 2 },
    { q: '¿Cuántos puntos vale un triple en baloncesto?', opts: ['3', '2', '1', '4'], correct: 0 },
    { q: '¿En qué país se originó el tenis?', opts: ['Inglaterra', 'Francia', 'España', 'Estados Unidos'], correct: 0 },
    { q: '¿Qué deporte se juega en un ring?', opts: ['Boxeo', 'Lucha libre', 'Judo', 'Taekwondo'], correct: 0 },
    { q: '¿Cuántos mundiales de fútbol ha ganado Argentina?', opts: ['3', '2', '1', '4'], correct: 0 },
    { q: '¿En qué deporte se usa un birdie?', opts: ['Bádminton', 'Tenis', 'Golf', 'Críquet'], correct: 0 },
    { q: '¿Cuál es la distancia de una maratón?', opts: ['42 km', '21 km', '10 km', '50 km'], correct: 0 },
    { q: '¿Qué deporte combina natación, ciclismo y carrera?', opts: ['Triatlón', 'Pentatlón', 'Decatlón', 'Biátlon'], correct: 0 },
    { q: '¿Cada cuántos años se celebran los Juegos Olímpicos?', opts: ['4', '2', '3', '5'], correct: 0 },
    { q: '¿Qué país inventó el fútbol?', opts: ['Inglaterra', 'Brasil', 'Argentina', 'España'], correct: 0 },
    { q: '¿Cuántos puntos tiene un partido de tenis?', opts: ['4', '3', '5', '6'], correct: 0 },
    { q: '¿Qué deporte usa un bate y una pelota?', opts: ['Béisbol', 'Fútbol', 'Baloncesto', 'Tenis'], correct: 0 },
    { q: '¿Cuántos jugadores tiene un equipo de voleibol?', opts: ['6', '5', '7', '4'], correct: 0 },
    { q: '¿Quién ganó el mundial de fútbol de 2022?', opts: ['Argentina', 'Francia', 'Brasil', 'Croacia'], correct: 0 },
    { q: '¿Cuál es el deporte más popular del mundo?', opts: ['Fútbol', 'Baloncesto', 'Tenis', 'Cricket'], correct: 0 },
  ],
  'entretenimiento': [
    { q: '¿Quién interpretó a Jack en Titanic?', opts: ['Leonardo DiCaprio', 'Brad Pitt', 'Johnny Depp', 'Tom Cruise'], correct: 0 },
    { q: '¿Cuál es la película más taquillera de la historia?', opts: ['Avatar', 'Avengers: Endgame', 'Titanic', 'Star Wars'], correct: 0 },
    { q: '¿Qué serie trata sobre una familia amarilla?', opts: ['Los Simpson', 'Family Guy', 'South Park', 'Bob Esponja'], correct: 0 },
    { q: '¿Quién dirigió "El Padrino"?', opts: ['Francis Ford Coppola', 'Martin Scorsese', 'Steven Spielberg', 'Alfred Hitchcock'], correct: 0 },
    { q: '¿Cuál es la casa más importante de Harry Potter?', opts: ['Gryffindor', 'Slytherin', 'Hufflepuff', 'Ravenclaw'], correct: 0 },
    { q: '¿Qué actor interpreta a Iron Man?', opts: ['Robert Downey Jr.', 'Chris Evans', 'Chris Hemsworth', 'Mark Ruffalo'], correct: 0 },
    { q: '¿En qué año se estrenó "Star Wars: Una nueva esperanza"?', opts: ['1977', '1980', '1975', '1983'], correct: 0 },
    { q: '¿Quién es el creador de Mickey Mouse?', opts: ['Walt Disney', 'Pixar', 'Steven Spielberg', 'George Lucas'], correct: 0 },
    { q: '¿Qué serie tiene como protagonista a Walter White?', opts: ['Breaking Bad', 'The Walking Dead', 'House of Cards', 'Stranger Things'], correct: 0 },
    { q: '¿Cuál es la saga de películas de magia más famosa?', opts: ['Harry Potter', 'El Señor de los Anillos', 'Star Wars', 'Crepúsculo'], correct: 0 },
    { q: '¿Qué actor interpretó al Joker en "The Dark Knight"?', opts: ['Heath Ledger', 'Joaquin Phoenix', 'Jack Nicholson', 'Jared Leto'], correct: 0 },
    { q: '¿Cuál es la serie más vista de Netflix?', opts: ['Stranger Things', 'The Crown', 'Squid Game', 'Bridgerton'], correct: 2 },
    { q: '¿Quién ganó el Oscar a mejor actor en 2024?', opts: ['Cillian Murphy', 'Bradley Cooper', 'Paul Giamatti', 'Jeffrey Wright'], correct: 0 },
    { q: '¿Qué película de animación tiene a un pez payaso?', opts: ['Buscando a Nemo', 'Toy Story', 'Shrek', 'Frozen'], correct: 0 },
    { q: '¿Cuántas temporadas tiene "Breaking Bad"?', opts: ['5', '4', '6', '7'], correct: 0 },
    { q: '¿Qué actor interpreta a Spider-Man en el MCU?', opts: ['Tom Holland', 'Andrew Garfield', 'Tobey Maguire', 'Miles Morales'], correct: 0 },
  ],
  'musica': [
    { q: '¿Quién es conocido como el "Rey del Pop"?', opts: ['Michael Jackson', 'Prince', 'Elvis Presley', 'Madonna'], correct: 0 },
    { q: '¿Qué instrumento tiene cuerdas y se toca con un arco?', opts: ['Violín', 'Guitarra', 'Piano', 'Arpa'], correct: 0 },
    { q: '¿Cuántas cuerdas tiene una guitarra estándar?', opts: ['6', '4', '8', '12'], correct: 0 },
    { q: '¿Quién cantó "Bohemian Rhapsody"?', opts: ['Queen', 'The Beatles', 'Led Zeppelin', 'Pink Floyd'], correct: 0 },
    { q: '¿Qué nota musical viene después de Do?', opts: ['Re', 'Mi', 'Fa', 'Sol'], correct: 0 },
    { q: '¿Cuál es el instrumento más grande de una orquesta?', opts: ['Arpa', 'Contrabajo', 'Tuba', 'Tambor'], correct: 1 },
    { q: '¿Quién compuso "Para Elisa"?', opts: ['Beethoven', 'Mozart', 'Bach', 'Chopin'], correct: 0 },
    { q: '¿Qué banda escribió "Hotel California"?', opts: ['Eagles', 'The Doors', 'The Rolling Stones', 'AC/DC'], correct: 0 },
    { q: '¿Cuál es el género musical nacido en Jamaica?', opts: ['Reggae', 'Salsa', 'Merengue', 'Bachata'], correct: 0 },
    { q: '¿Qué cantante argentino es famoso por "Maradona"?', opts: ['Andrés Calamaro', 'Charly García', 'Fito Páez', 'Luis Alberto Spinetta'], correct: 0 },
    { q: '¿Cuántas sinfonías escribió Beethoven?', opts: ['9', '5', '7', '12'], correct: 0 },
    { q: '¿Quién cantó "Thriller"?', opts: ['Michael Jackson', 'Prince', 'Stevie Wonder', 'Lionel Richie'], correct: 0 },
    { q: '¿Cuál es el instrumento de viento más común?', opts: ['Flauta', 'Trompeta', 'Saxofón', 'Clarinete'], correct: 0 },
    { q: '¿Qué banda británica cantó "Hey Jude"?', opts: ['The Beatles', 'The Rolling Stones', 'Queen', 'Led Zeppelin'], correct: 0 },
    { q: '¿Cuántas teclas tiene un piano estándar?', opts: ['88', '76', '61', '108'], correct: 0 },
    { q: '¿Qué cantante es conocida como la "Reina del Pop"?', opts: ['Madonna', 'Lady Gaga', 'Beyoncé', 'Britney Spears'], correct: 0 },
    { q: '¿Cuál es el género musical más escuchado del mundo?', opts: ['Pop', 'Rock', 'Reguetón', 'Electrónica'], correct: 0 },
  ],
  'videojuegos': [
    { q: '¿Cuál es el videojuego más vendido de la historia?', opts: ['Minecraft', 'Tetris', 'GTA V', 'Wii Sports'], correct: 0 },
    { q: '¿Quién es el fontanero más famoso de Nintendo?', opts: ['Mario', 'Luigi', 'Link', 'Sonic'], correct: 0 },
    { q: '¿En qué juego aparecen los creepers?', opts: ['Minecraft', 'Fortnite', 'Roblox', 'Terraria'], correct: 0 },
    { q: '¿Qué consola lanzó Nintendo en 2017?', opts: ['Switch', 'Wii U', '3DS', 'Wii'], correct: 0 },
    { q: '¿Cuál es el juego de batalla real más popular?', opts: ['Fortnite', 'PUBG', 'Apex Legends', 'Call of Duty Warzone'], correct: 0 },
    { q: '¿Quién es el protagonista de "The Legend of Zelda"?', opts: ['Link', 'Zelda', 'Ganon', 'Epona'], correct: 0 },
    { q: '¿Qué empresa crea Pokémon?', opts: ['Nintendo', 'Game Freak', 'Sega', 'Sony'], correct: 1 },
    { q: '¿En qué juego tienes que construir con cubos?', opts: ['Minecraft', 'Roblox', 'Fortnite', 'Terraria'], correct: 0 },
    { q: '¿Cuál es el personaje principal de "Grand Theft Auto V"?', opts: ['Michael', 'Trevor', 'Franklin', 'Todos los anteriores'], correct: 3 },
    { q: '¿Qué juego tiene un mapa llamado "Isla de los Vivos"?', opts: ['Fortnite', 'PUBG', 'Free Fire', 'Apex Legends'], correct: 2 },
    { q: '¿Cómo se llama el hermano de Mario?', opts: ['Luigi', 'Wario', 'Yoshi', 'Bowser'], correct: 0 },
    { q: '¿Qué consola fue la primera de Sony?', opts: ['PlayStation', 'PlayStation 2', 'PlayStation Portable', 'PlayStation 3'], correct: 0 },
    { q: '¿Cuál es el personaje más famoso de Sega?', opts: ['Sonic', 'Mario', 'Crash', 'Spyro'], correct: 0 },
    { q: '¿Qué juego popular tiene un bloque de tierra?', opts: ['Minecraft', 'Terraria', 'Roblox', 'LEGO Worlds'], correct: 0 },
    { q: '¿En qué año se lanzó Fortnite?', opts: ['2017', '2018', '2016', '2019'], correct: 0 },
    { q: '¿Cuál es la consola más vendida de todos los tiempos?', opts: ['PlayStation 2', 'Nintendo DS', 'Game Boy', 'PlayStation 4'], correct: 0 },
  ],
  'arte': [
    { q: '¿Quién pintó "La noche estrellada"?', opts: ['Vincent van Gogh', 'Pablo Picasso', 'Claude Monet', 'Salvador Dalí'], correct: 0 },
    { q: '¿Cuál es la obra más famosa de Leonardo da Vinci?', opts: ['Mona Lisa', 'La Última Cena', 'La Gioconda', 'El Hombre de Vitruvio'], correct: 0 },
    { q: '¿Qué movimiento artístico representa "El Grito"?', opts: ['Expresionismo', 'Impresionismo', 'Cubismo', 'Surrealismo'], correct: 0 },
    { q: '¿Quién pintó el techo de la Capilla Sixtina?', opts: ['Miguel Ángel', 'Rafael', 'Leonardo da Vinci', 'Donatello'], correct: 0 },
    { q: '¿Qué artista es conocido por sus relojes derretidos?', opts: ['Salvador Dalí', 'Picasso', 'Van Gogh', 'Monet'], correct: 0 },
    { q: '¿Cuál es la escultura más famosa de Miguel Ángel?', opts: ['David', 'La Piedad', 'Moisés', 'El Pensador'], correct: 0 },
    { q: '¿Qué pintor español fundó el Cubismo?', opts: ['Pablo Picasso', 'Salvador Dalí', 'Joan Miró', 'Francisco de Goya'], correct: 0 },
    { q: '¿En qué museo se encuentra la Mona Lisa?', opts: ['Louvre', 'Museo de Orsay', 'Metropolitan', 'Galería de los Uffizi'], correct: 0 },
    { q: '¿Quién escribió "La Divina Comedia"?', opts: ['Dante Alighieri', 'Petrarca', 'Boccaccio', 'Virgilio'], correct: 0 },
    { q: '¿Cuál es la obra más famosa de William Shakespeare?', opts: ['Romeo y Julieta', 'Hamlet', 'Macbeth', 'Otelo'], correct: 0 },
    { q: '¿Qué corriente artística busca representar los sueños?', opts: ['Surrealismo', 'Realismo', 'Impresionismo', 'Cubismo'], correct: 0 },
    { q: '¿Quién es conocido como el padre del Impresionismo?', opts: ['Claude Monet', 'Edgar Degas', 'Pierre-Auguste Renoir', 'Édouard Manet'], correct: 0 },
    { q: '¿Cuál es la obra más famosa de Frida Kahlo?', opts: ['Las dos Fridas', 'Autorretrato con collar', 'La columna rota', 'Viva la vida'], correct: 0 },
    { q: '¿Qué artista neerlandés es famoso por sus girasoles?', opts: ['Vincent van Gogh', 'Rembrandt', 'Johannes Vermeer', 'Piet Mondrian'], correct: 0 },
    { q: '¿Quién escribió "Cien años de soledad"?', opts: ['Gabriel García Márquez', 'Mario Vargas Llosa', 'Jorge Luis Borges', 'Pablo Neruda'], correct: 0 },
  ],
  'animales': [
    { q: '¿Cuál es el animal terrestre más grande?', opts: ['Elefante africano', 'Rinoceronte blanco', 'Hipopótamo', 'Jirafa'], correct: 0 },
    { q: '¿Qué animal es conocido como "el rey de la selva"?', opts: ['León', 'Tigre', 'Elefante', 'Gorila'], correct: 0 },
    { q: '¿Cuántas vidas se dice que tiene un gato?', opts: ['7', '9', '5', '3'], correct: 0 },
    { q: '¿Qué animal cambia de color para camuflarse?', opts: ['Camaleón', 'Pulpo', 'Calamar', 'Todas las anteriores'], correct: 3 },
    { q: '¿Cuál es el ave más grande del mundo?', opts: ['Avestruz', 'Emú', 'Albatros', 'Cóndor'], correct: 0 },
    { q: '¿Qué animal duerme de pie?', opts: ['Caballo', 'Perro', 'Gato', 'Oso'], correct: 0 },
    { q: '¿Cuál es el mamífero marino más grande?', opts: ['Ballena azul', 'Orca', 'Cachalote', 'Delfín'], correct: 0 },
    { q: '¿Qué animal tiene la mordida más poderosa?', opts: ['Cocodrilo', 'León', 'Tiburón blanco', 'Hipopótamo'], correct: 0 },
    { q: '¿Cuál es el animal más venenoso del mundo?', opts: ['Avispa de mar', 'Taipán', 'Rana dardo dorada', 'Pez globo'], correct: 2 },
    { q: '¿Qué animal es símbolo de la sabiduría?', opts: ['Búho', 'Zorro', 'Elefante', 'Delfín'], correct: 0 },
    { q: '¿Cuántos estómagos tiene una vaca?', opts: ['4', '2', '3', '1'], correct: 0 },
    { q: '¿Qué animal puede volar hacia atrás?', opts: ['Colibrí', 'Murciélago', 'Águila', 'Gaviota'], correct: 0 },
    { q: '¿Cuál es el primate más grande?', opts: ['Gorila', 'Orangután', 'Chimpancé', 'Mono araña'], correct: 0 },
    { q: '¿Qué animal vive más años?', opts: ['Ballena de Groenlandia', 'Elefante', 'Tortuga galápagos', 'Loro'], correct: 2 },
    { q: '¿Cuántas especies de pingüinos existen?', opts: ['18', '10', '25', '30'], correct: 0 },
    { q: '¿Qué animal es el más inteligente después del humano?', opts: ['Delfín', 'Chimpancé', 'Pulpo', 'Perro'], correct: 0 },
    { q: '¿Cuál es el felino más grande del mundo?', opts: ['Tigre', 'León', 'Jaguar', 'Leopardo'], correct: 0 },
    { q: '¿Qué animal pone los huevos más grandes?', opts: ['Avestruz', 'Emú', 'Albatros', 'Cóndor'], correct: 0 },
  ],
};

export async function fetchQuestions(amount, topic, difficulty) {
  const category = CATEGORIES[topic];
  if (category) {
    try {
      const questions = await fetchFromOpenTrivia(amount, difficulty, category.id);
      try {
        const spanish = await translateQuestions(questions);
        return spanish;
      } catch {
        return questions;
      }
    } catch (err) {
      console.log('Open Trivia DB failed, using Spanish fallback:', err.message);
    }
  }
  const pool = fallbackPool[topic] || fallbackPool['conocimiento-general'];
  const shuffled = shuffleArray(pool);
  const selected = shuffled.slice(0, Math.min(amount, pool.length));
  return selected.map(item => formatFallback(item, topic, difficulty));
}

export { CATEGORIES };
