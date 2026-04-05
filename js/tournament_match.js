let currentName = null;
let timer = 30;
let score = 0;
let currentQ = 0;
let interval = null;
let selected = null;

const questions = [
  { q: "Which data structure uses LIFO (Last In First Out)?", opts: ["Queue", "Stack", "Tree", "Graph"], ans: 1 },
  { q: "What is the time complexity of binary search?", opts: ["O(n)", "O(n log n)", "O(log n)", "O(1)"], ans: 2 },
  { q: "Which of the following sorting algorithms is generally fastest in practice?", opts: ["Bubble Sort", "Insertion Sort", "Selection Sort", "Quick Sort"], ans: 3 }
];

window.onload = async function() {
  const name = localStorage.getItem('edurank_current');
  if (!name) { window.location.href = 'index.html'; return; }
  currentName = name;
  
  loadQuestion();
  startTimer();
};

function startTimer() {
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
  document.getElementById('gameScreen').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'block';
  
  document.getElementById('finalScore').textContent = score;
  const eloEarned = score * 15;
  document.getElementById('eloGain').textContent = `+${eloEarned} ELO Points`;
  
  // Submit to backend
  await playTournament(currentName, score);
}

function finishRun() {
  window.location.href = 'tournament.html';
}
