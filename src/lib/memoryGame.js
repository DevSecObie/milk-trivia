import { BIBLE_BOOKS, TOTAL_BOOKS, SECTIONS, getBook, getNextBook, getPrevBook, getBooksInSection } from '../data/bibleBooks'

function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}; return a }

function randomBooks(exclude, count) {
  return shuffle(BIBLE_BOOKS.filter(b => !exclude.includes(b.name))).slice(0, count).map(b => b.name)
}

function randomFromSection(section, exclude, count) {
  return shuffle(getBooksInSection(section).filter(b => !exclude.includes(b.name))).slice(0, count).map(b => b.name)
}

// Question generators
const generators = [
  // What comes after?
  (difficulty) => {
    const maxN = difficulty === 'easy' ? 39 : difficulty === 'medium' ? 53 : TOTAL_BOOKS
    const idx = Math.floor(Math.random() * (maxN - 1)) + 1
    const book = getBook(idx)
    const next = getNextBook(idx)
    if (!next) return null
    const wrongs = randomBooks([next.name, book.name], 3)
    return { type: 'after', question: `What book comes after ${book.name}?`, answer: next.name, options: shuffle([next.name, ...wrongs]), hint: `Book #${book.n} → ?` }
  },
  // What comes before?
  (difficulty) => {
    const maxN = difficulty === 'easy' ? 39 : difficulty === 'medium' ? 53 : TOTAL_BOOKS
    const idx = Math.floor(Math.random() * (maxN - 1)) + 2
    const book = getBook(idx)
    const prev = getPrevBook(idx)
    if (!prev) return null
    const wrongs = randomBooks([prev.name, book.name], 3)
    return { type: 'before', question: `What book comes before ${book.name}?`, answer: prev.name, options: shuffle([prev.name, ...wrongs]), hint: `? → Book #${book.n}` }
  },
  // Which section?
  (difficulty) => {
    const book = BIBLE_BOOKS[Math.floor(Math.random() * TOTAL_BOOKS)]
    const sectionLabel = SECTIONS[book.section]
    return { type: 'section', question: `Which section is ${book.name} in?`, answer: sectionLabel, options: ['Old Testament', 'Apocrypha', 'New Testament'], hint: `Book #${book.n}` }
  },
  // What number is this book?
  (difficulty) => {
    const book = BIBLE_BOOKS[Math.floor(Math.random() * TOTAL_BOOKS)]
    const correct = book.n
    const wrongs = shuffle([...Array(TOTAL_BOOKS)].map((_, i) => i + 1).filter(n => n !== correct)).slice(0, 3)
    return { type: 'number', question: `What number is ${book.name} in the full sequence?`, answer: String(correct), options: shuffle([String(correct), ...wrongs.map(String)]), hint: book.section }
  },
  // Which book is number N?
  (difficulty) => {
    const book = BIBLE_BOOKS[Math.floor(Math.random() * TOTAL_BOOKS)]
    const wrongs = randomBooks([book.name], 3)
    return { type: 'whichNum', question: `Which book is #${book.n} in the Bible?`, answer: book.name, options: shuffle([book.name, ...wrongs]), hint: SECTIONS[book.section] }
  },
  // What comes between A and C?
  (difficulty) => {
    const maxN = difficulty === 'easy' ? 38 : difficulty === 'medium' ? 52 : TOTAL_BOOKS - 1
    const idx = Math.floor(Math.random() * (maxN - 2)) + 1
    const a = getBook(idx)
    const b = getBook(idx + 1)
    const c = getBook(idx + 2)
    if (!a || !b || !c) return null
    const wrongs = randomBooks([b.name, a.name, c.name], 3)
    return { type: 'between', question: `Which book comes between ${a.name} and ${c.name}?`, answer: b.name, options: shuffle([b.name, ...wrongs]), hint: `Books #${a.n}-${c.n}` }
  },
  // Which belongs to Apocrypha?
  () => {
    const apBooks = getBooksInSection('AP')
    const correct = apBooks[Math.floor(Math.random() * apBooks.length)]
    const wrongs = shuffle([...getBooksInSection('OT'), ...getBooksInSection('NT')]).slice(0, 3)
    return { type: 'belongsAP', question: 'Which of these books belongs to the Apocrypha?', answer: correct.name, options: shuffle([correct.name, ...wrongs.map(b => b.name)]) }
  },
  // Which belongs to NT?
  () => {
    const ntBooks = getBooksInSection('NT')
    const correct = ntBooks[Math.floor(Math.random() * ntBooks.length)]
    const wrongs = shuffle([...getBooksInSection('OT'), ...getBooksInSection('AP')]).slice(0, 3)
    return { type: 'belongsNT', question: 'Which of these books belongs to the New Testament?', answer: correct.name, options: shuffle([correct.name, ...wrongs.map(b => b.name)]) }
  },
  // Which belongs to OT?
  () => {
    const otBooks = getBooksInSection('OT')
    const correct = otBooks[Math.floor(Math.random() * otBooks.length)]
    const wrongs = shuffle([...getBooksInSection('AP'), ...getBooksInSection('NT')]).slice(0, 3)
    return { type: 'belongsOT', question: 'Which of these books belongs to the Old Testament?', answer: correct.name, options: shuffle([correct.name, ...wrongs.map(b => b.name)]) }
  },
]

export function generateQuestion(difficulty = 'medium') {
  let attempts = 0
  while (attempts < 20) {
    const gen = generators[Math.floor(Math.random() * generators.length)]
    const q = gen(difficulty)
    if (q) return q
    attempts++
  }
  return generators[2](difficulty) // fallback to section question
}

export function generateRound(count = 10, difficulty = 'medium', focusTypes = null) {
  const questions = []
  const seen = new Set()
  let attempts = 0
  while (questions.length < count && attempts < count * 5) {
    const q = generateQuestion(difficulty)
    const key = `${q.type}:${q.question}`
    if (!seen.has(key)) {
      if (!focusTypes || focusTypes.includes(q.type)) {
        seen.add(key)
        questions.push(q)
      }
    }
    attempts++
  }
  return questions
}

export const DIFFICULTY_LEVELS = [
  { id: 'easy', label: 'Easy', desc: 'Old Testament only (39 books)', color: '#00FF88' },
  { id: 'medium', label: 'Medium', desc: 'OT + Apocrypha (53 books)', color: '#00D4FF' },
  { id: 'hard', label: 'Hard', desc: 'All 80 books — full Bible', color: '#FF3366' },
]

export const QUESTION_TYPES = [
  { id: 'after', label: 'What Comes After' },
  { id: 'before', label: 'What Comes Before' },
  { id: 'between', label: 'What Comes Between' },
  { id: 'section', label: 'Which Section' },
  { id: 'number', label: 'Book Number' },
  { id: 'whichNum', label: 'Which Book Is #N' },
  { id: 'belongsOT', label: 'Belongs to OT' },
  { id: 'belongsAP', label: 'Belongs to Apocrypha' },
  { id: 'belongsNT', label: 'Belongs to NT' },
]
