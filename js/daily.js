// =============================================
//  EduRank — daily.js
//  Daily Challenge System (complete rewrite)
//  Uses backend API for questions, submissions,
//  once-per-day enforcement, and old questions.
// =============================================

let studentData = null;
let timeLeft = 60;
let timerInterval = null;
let selectedAnswer = null;
let todayDate = new Date().toISOString().slice(0, 10);
let submitting = false;

// Old questions state
let oldSelectedAnswer = null;
let currentOldQuestion = null;

// ── Init on page load ──
window.onload = async function() {
  const name = localStorage.getItem('edurank_current');
  if (!name) { window.location.href = 'index.html'; return; }
  
  studentData = await getStudent(name);
  if (!studentData) { window.location.href = 'index.html'; return; }

  // Update streak display
  if (document.getElementById('streakNum')) {
    document.getElementById('streakNum').textContent = studentData.streak || 0;
  }

  // Check localStorage for quick guard (backend is authoritative)
  const dailyKey = `edurank_daily_${todayDate}_${name}`;
  
  // Load today's question from backend
  await loadTodayQuestion();
};

// ── Load today's question from backend ──
async function loadTodayQuestion() {
  const name = studentData.name;
  const data = await getDailyQuestion(name);
  
  if (!data) {
    document.getElementById('quizArea').innerHTML = `
      <h3 style="color:#ef4444; text-align:center;">Failed to load question. Is the backend running?</h3>
    `;
    document.getElementById('quizArea').style.display = 'block';
    return;
  }

  if (data.already_attempted) {
    // Already done today — show completion message
    showAlreadyDone(data);
    return;
  }

  // Show the question
  renderQuestion(data);
  startTimer();
}

// ── Show already-completed state ──
function showAlreadyDone(data) {
  document.getElementById('quizArea').style.display = 'none';
  document.getElementById('resultArea').style.display = 'none';
  document.getElementById('alreadyDone').style.display = 'block';
  
  const prev = data.previous_result || {};
  if (prev.correct) {
    document.getElementById('alreadyIcon').textContent = '✅';
    document.getElementById('alreadyTitle').textContent = 'You Got It Right!';
    document.getElementById('alreadyText').textContent = 'You already answered today\'s challenge correctly. Come back tomorrow!';
    document.getElementById('alreadyElo').textContent = `+${prev.elo_change || 15} ELO earned today`;
    document.getElementById('alreadyElo').style.color = '#10b981';
  } else {
    document.getElementById('alreadyIcon').textContent = '❌';
    document.getElementById('alreadyTitle').textContent = 'Already Attempted';
    document.getElementById('alreadyTitle').style.color = '#ef4444';
    document.getElementById('alreadyText').textContent = 'You answered incorrectly today. Try again tomorrow!';
    document.getElementById('alreadyElo').textContent = `${prev.elo_change || -5} ELO`;
    document.getElementById('alreadyElo').style.color = '#ef4444';
  }
  
  // Stop timer
  clearInterval(timerInterval);
  document.getElementById('dailyTimer').textContent = '--:--';
}

// ── Render question into the quiz area ──
function renderQuestion(data) {
  document.getElementById('quizArea').style.display = 'block';
  document.getElementById('alreadyDone').style.display = 'none';
  document.getElementById('resultArea').style.display = 'none';
  
  // Difficulty badge
  const badge = document.getElementById('diffBadge');
  badge.textContent = data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1);
  badge.className = 'difficulty-badge ' + data.difficulty;

  // Question text
  document.getElementById('questionText').textContent = data.question;
  
  // Options
  const grid = document.getElementById('optionsGrid');
  const labels = ['A', 'B', 'C', 'D'];
  grid.innerHTML = data.options.map((opt, i) => `
    <button class="option-btn" onclick="selectOption(${i})">${labels[i]}. ${opt}</button>
  `).join('');
  
  selectedAnswer = null;
  document.getElementById('submitBtn').disabled = true;
}

// ── Timer ──
function startTimer() {
  timeLeft = 60;
  document.getElementById('dailyTimer').textContent = '01:00';
  
  timerInterval = setInterval(() => {
    timeLeft--;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    document.getElementById('dailyTimer').textContent = 
      `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    if (timeLeft <= 10) {
      document.getElementById('dailyTimer').style.color = '#ef4444';
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimeout();
    }
  }, 1000);
}

// ── Select option ──
function selectOption(index) {
  selectedAnswer = index;
  document.querySelectorAll('#optionsGrid .option-btn').forEach((btn, i) => {
    btn.classList.toggle('selected', i === index);
  });
  document.getElementById('submitBtn').disabled = false;
}

// ── Timeout ──
function handleTimeout() {
  // On timeout, submit with a deliberately wrong answer (-1)
  submitToBackend(-1, false);
}

// ── Submit today's answer ──
async function submitAnswer() {
  if (submitting || selectedAnswer === null) return;
  submitting = true;
  clearInterval(timerInterval);
  
  document.getElementById('submitBtn').disabled = true;
  document.getElementById('submitBtn').textContent = 'Submitting...';
  
  await submitToBackend(selectedAnswer, false);
}

// ── Submit to backend ──
async function submitToBackend(answerIndex, isOld) {
  const name = studentData.name;
  
  const result = await submitDaily({
    name: name,
    date: todayDate,
    answer_index: answerIndex,
    is_old: isOld
  });
  
  if (result && result._error) {
    if (result.already_attempted) {
      showAlreadyDone({ previous_result: { correct: false } });
    } else {
      alert('Error: ' + result._error);
    }
    submitting = false;
    return;
  }
  
  // Save to localStorage for quick guard
  const dailyKey = `edurank_daily_${todayDate}_${name}`;
  localStorage.setItem(dailyKey, JSON.stringify(result));
  
  // Show result
  showResult(result);
  
  // Re-fetch student data to update UI
  studentData = await getStudent(name);
  if (document.getElementById('streakNum')) {
    document.getElementById('streakNum').textContent = studentData.streak || 0;
  }
  
  submitting = false;
}

// ── Show result ──
function showResult(result) {
  document.getElementById('quizArea').style.display = 'none';
  document.getElementById('alreadyDone').style.display = 'none';
  document.getElementById('resultArea').style.display = 'block';
  
  const icon = document.getElementById('resultIcon');
  const title = document.getElementById('resultTitle');
  const text = document.getElementById('resultText');
  const elo = document.getElementById('resultElo');
  
  if (result.correct) {
    icon.textContent = '🏆';
    title.textContent = 'Correct Answer!';
    title.style.color = '#10b981';
    text.textContent = `You earned +${result.elo_change} ELO! Your streak continues!`;
    elo.textContent = `New ELO: ${result.new_elo}`;
    elo.style.color = '#10b981';
  } else {
    icon.textContent = '❌';
    title.textContent = 'Incorrect!';
    title.style.color = '#ef4444';
    text.textContent = `You lost ${Math.abs(result.elo_change)} ELO. The correct answer was option ${['A','B','C','D'][result.correct_answer]}.`;
    elo.textContent = `New ELO: ${result.new_elo}`;
    elo.style.color = '#ef4444';
  }
}


// =============================================
// TAB SWITCHING
// =============================================

function switchDailyTab(tab) {
  document.getElementById('tabToday').classList.toggle('active', tab === 'today');
  document.getElementById('tabOld').classList.toggle('active', tab === 'old');
  document.getElementById('todayTab').style.display = tab === 'today' ? 'block' : 'none';
  document.getElementById('oldTab').style.display = tab === 'old' ? 'block' : 'none';
  
  if (tab === 'old') {
    loadOldQuestions();
  }
}


// =============================================
// OLD QUESTIONS
// =============================================

async function loadOldQuestions() {
  const name = studentData.name;
  const questions = await getOldQuestions(name);
  
  const grid = document.getElementById('oldQuestionsGrid');
  
  if (!questions || questions.length === 0) {
    grid.innerHTML = `
      <div style="text-align:center; color:#9ca3af; padding:40px;">
        <div style="font-size:2rem; margin-bottom:10px;">🎉</div>
        <p>You've completed all recent past questions! Check back tomorrow.</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = questions.map((q, i) => {
    const dayName = formatPastDate(q.date);
    return `
      <div class="old-question-card" onclick="startOldQuestion(${i})">
        <div class="old-q-date">${dayName} <span class="old-q-badge">${q.difficulty}</span></div>
        <div class="old-q-text">${q.question}</div>
        <div class="old-q-reward">+5 ELO reward</div>
      </div>
    `;
  }).join('');
  
  // Store questions for later use
  window._oldQuestions = questions;
}

function formatPastDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  return d.toLocaleDateString('en-US', options);
}

function startOldQuestion(index) {
  const q = window._oldQuestions[index];
  if (!q) return;
  
  currentOldQuestion = q;
  oldSelectedAnswer = null;
  
  // Hide list, show quiz
  document.getElementById('oldQuestionsGrid').style.display = 'none';
  document.getElementById('oldResultArea').style.display = 'none';
  document.getElementById('oldQuizArea').style.display = 'block';
  
  // Badge
  document.getElementById('oldDateBadge').textContent = `Past: ${formatPastDate(q.date)} (${q.difficulty})`;
  
  // Question
  document.getElementById('oldQuestionText').textContent = q.question;
  
  // Options
  const labels = ['A', 'B', 'C', 'D'];
  document.getElementById('oldOptionsGrid').innerHTML = q.options.map((opt, i) => `
    <button class="option-btn" onclick="selectOldOption(${i})">${labels[i]}. ${opt}</button>
  `).join('');
  
  document.getElementById('oldSubmitBtn').disabled = true;
}

function selectOldOption(index) {
  oldSelectedAnswer = index;
  document.querySelectorAll('#oldOptionsGrid .option-btn').forEach((btn, i) => {
    btn.classList.toggle('selected', i === index);
  });
  document.getElementById('oldSubmitBtn').disabled = false;
}

async function submitOldAnswer() {
  if (submitting || oldSelectedAnswer === null || !currentOldQuestion) return;
  submitting = true;
  
  document.getElementById('oldSubmitBtn').disabled = true;
  document.getElementById('oldSubmitBtn').textContent = 'Submitting...';
  
  const result = await submitDaily({
    name: studentData.name,
    date: currentOldQuestion.date,
    answer_index: oldSelectedAnswer,
    is_old: true
  });
  
  if (result && result._error) {
    alert('Error: ' + result._error);
    submitting = false;
    document.getElementById('oldSubmitBtn').disabled = false;
    document.getElementById('oldSubmitBtn').textContent = 'Submit Answer';
    return;
  }
  
  // Show old result
  document.getElementById('oldQuizArea').style.display = 'none';
  document.getElementById('oldResultArea').style.display = 'block';
  
  if (result.correct) {
    document.getElementById('oldResultIcon').textContent = '✅';
    document.getElementById('oldResultTitle').textContent = 'Correct!';
    document.getElementById('oldResultTitle').style.color = '#10b981';
    document.getElementById('oldResultText').textContent = `+${result.elo_change} ELO earned from this past question.`;
  } else {
    document.getElementById('oldResultIcon').textContent = '❌';
    document.getElementById('oldResultTitle').textContent = 'Incorrect';
    document.getElementById('oldResultTitle').style.color = '#ef4444';
    document.getElementById('oldResultText').textContent = `${result.elo_change} ELO. Correct answer was ${['A','B','C','D'][result.correct_answer]}.`;
  }
  
  // Refresh student data
  studentData = await getStudent(studentData.name);
  if (document.getElementById('streakNum')) {
    document.getElementById('streakNum').textContent = studentData.streak || 0;
  }
  
  submitting = false;
}

function cancelOldQuestion() {
  document.getElementById('oldQuizArea').style.display = 'none';
  document.getElementById('oldResultArea').style.display = 'none';
  document.getElementById('oldQuestionsGrid').style.display = 'grid';
  document.getElementById('oldSubmitBtn').textContent = 'Submit Answer';
  
  // Reload list (completed ones are now filtered)
  loadOldQuestions();
}
