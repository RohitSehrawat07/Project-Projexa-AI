// =============================================
//  EduRank — tournament_match.js
//  Quiz-based tournament run
//  Supports Competitive + Practice modes
// =============================================

let currentName = null;
let timer = 30;
let score = 0;
let currentQ = 0;
let interval = null;
let selected = null;
let startTime = null;
let totalTime = 0;
let gameMode = 'competitive'; // or 'practice'
let submitting = false;

// Expanded question bank (15 questions, 5 selected randomly per run)
const MATCH_QUESTIONS = [
  { q: "Which data structure uses LIFO (Last In First Out)?", opts: ["Queue", "Stack", "Tree", "Graph"], ans: 1 },
  { q: "What is the time complexity of binary search?", opts: ["O(n)", "O(n log n)", "O(log n)", "O(1)"], ans: 2 },
  { q: "Which sorting algorithm is generally fastest in practice?", opts: ["Bubble Sort", "Insertion Sort", "Selection Sort", "Quick Sort"], ans: 3 },
  { q: "What does SQL stand for?", opts: ["Structured Query Language", "Simple Query Language", "System Query Logic", "Standard Query Loop"], ans: 0 },
  { q: "Which protocol is used for secure web communication?", opts: ["HTTP", "FTP", "HTTPS", "SMTP"], ans: 2 },
  { q: "What is the worst-case time complexity of Quick Sort?", opts: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], ans: 2 },
  { q: "Which of the following is a NoSQL database?", opts: ["MySQL", "PostgreSQL", "MongoDB", "Oracle"], ans: 2 },
  { q: "What does OOP stand for?", opts: ["Object Oriented Programming", "Open Online Platform", "Ordered Operation Process", "Output Oriented Protocol"], ans: 0 },
  { q: "Which JavaScript method converts JSON string to object?", opts: ["JSON.stringify()", "JSON.parse()", "JSON.convert()", "JSON.decode()"], ans: 1 },
  { q: "What does FIFO stand for?", opts: ["First In First Out", "Final Input Final Output", "First Index First Output", "File In File Out"], ans: 0 },
  { q: "Which CSS property is used to make text bold?", opts: ["text-style", "font-weight", "text-weight", "font-bold"], ans: 1 },
  { q: "What is the default port for HTTP?", opts: ["21", "25", "80", "443"], ans: 2 },
  { q: "What is polymorphism in OOP?", opts: ["Hiding data", "Multiple inheritance", "Same interface different behavior", "Code reuse"], ans: 2 },
  { q: "Which Python keyword is used to define a function?", opts: ["func", "define", "def", "function"], ans: 2 },
  { q: "What is the Big-O of accessing an element in a hash table?", opts: ["O(n)", "O(log n)", "O(1)", "O(n²)"], ans: 2 },
];

let questions = [];
const QUESTIONS_PER_RUN = 5;

window.onload = async function() {
  const name = localStorage.getItem('edurank_current');
  if (!name) { window.location.href = 'index.html'; return; }
  currentName = name;
  
  // Detect mode from URL
  const params = new URLSearchParams(window.location.search);
  gameMode = params.get('mode') || 'competitive';
  
  // Update title based on mode
  const titleEl = document.querySelector('.run-title');
  if (titleEl) {
    titleEl.textContent = gameMode === 'practice' ? '📝 Practice Run' : '⚔️ Tournament Run';
  }
  
  // Randomly select questions
  questions = shuffleArray([...MATCH_QUESTIONS]).slice(0, QUESTIONS_PER_RUN);
  
  loadQuestion();
  startTimer();
  startTime = Date.now();
};

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startTimer() {
  timer = 45; // 45 seconds for 5 questions
  document.getElementById('timer').textContent = `0:${timer.toString().padStart(2, '0')}`;
  
  interval = setInterval(() => {
    timer--;
    document.getElementById('timer').textContent = `0:${timer.toString().padStart(2, '0')}`;
    
    if (timer <= 10) document.getElementById('timer').style.color = '#dc2626';
    if (timer <= 0) {
      clearInterval(interval);
      endRun();
    }
  }, 1000);
}

function loadQuestion() {
  selected = null;
  const q = questions[currentQ];
  document.getElementById('qCounter').textContent = `Question ${currentQ + 1} of ${questions.length}`;
  document.getElementById('qText').textContent = q.q;
  
  const cont = document.getElementById('optionsCont');
  cont.innerHTML = q.opts.map((opt, i) => `
    <button class="opt-btn" onclick="selectOpt(${i})">${['A','B','C','D'][i]}. ${opt}</button>
  `).join('');
  
  const nextBtn = document.getElementById('nextBtn');
  nextBtn.classList.remove('enabled');
  nextBtn.textContent = currentQ === questions.length - 1 ? 'Submit Run' : 'Next Question';
}

function selectOpt(index) {
  selected = index;
  const btns = document.querySelectorAll('.opt-btn');
  btns.forEach(b => b.classList.remove('selected'));
  btns[index].classList.add('selected');
  document.getElementById('nextBtn').classList.add('enabled');
}

function nextQuestion() {
  if (selected === null) return;
  
  if (selected === questions[currentQ].ans) {
    score++;
  }
  
  currentQ++;
  if (currentQ >= questions.length) {
    clearInterval(interval);
    endRun();
  } else {
    loadQuestion();
  }
}

async function endRun() {
  if (submitting) return;
  submitting = true;
  
  totalTime = (Date.now() - startTime) / 1000;
  const avgTime = totalTime / questions.length;
  
  document.getElementById('gameScreen').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'block';
  
  document.getElementById('finalScore').textContent = score;
  
  // Submit to backend based on mode
  let result;
  if (gameMode === 'practice') {
    // Practice mode — use tournament practice endpoint
    result = await submitTournamentPractice({
      name: currentName,
      total_questions: questions.length,
      correct_answers: score,
      avg_time: Math.round(avgTime * 100) / 100
    });
  } else {
    // Competitive mode — use quiz submit endpoint  
    result = await submitQuiz({
      name: currentName,
      total_questions: questions.length,
      correct_answers: score,
      avg_time: Math.round(avgTime * 100) / 100,
      difficulty: 'medium'
    });
  }
  
  // Display ELO change
  if (result && result.elo_change !== undefined) {
    const change = result.elo_change;
    const sign = change >= 0 ? '+' : '';
    document.getElementById('eloGain').textContent = `${sign}${change} ELO Points`;
    document.getElementById('eloGain').style.color = change >= 0 ? 'var(--green, #81b64c)' : '#ef4444';
  } else if (result) {
    // Fallback: calculate approximate change
    const eloEarned = score * 10;
    document.getElementById('eloGain').textContent = `~+${eloEarned} ELO Points`;
  } else {
    document.getElementById('eloGain').textContent = 'ELO update failed – check connection';
    document.getElementById('eloGain').style.color = '#ef4444';
  }
  
  submitting = false;
}

function finishRun() {
  window.location.href = 'tournament.html';
}
