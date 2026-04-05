let studentData = null;
let timeLeft = 60;
let timerInterval = null;
let selectedAnswer = null;

window.onload = async function() {
  const name = localStorage.getItem('edurank_current');
  if (!name) { window.location.href = 'index.html'; return; }
  
  studentData = await getStudent(name);
  if (studentData && document.getElementById('streakNum')) {
    document.getElementById('streakNum').textContent = studentData.streak;
  }
  
  startTimer();
};

function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft--;
    const display = document.getElementById('dailyTimer');
    display.textContent = `00:${timeLeft.toString().padStart(2, '0')}`;
    
    if (timeLeft <= 10) { display.style.color = '#ef4444'; }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimeout();
    }
  }, 1000);
}

function selectOption(index, value) {
  selectedAnswer = value;
  document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
  document.querySelectorAll('.option-btn')[index].classList.add('selected');
  document.getElementById('submitBtn').disabled = false;
}

function handleTimeout() {
  document.getElementById('quizArea').innerHTML = `
    <h2 style="color:#ef4444;text-align:center;">Time's Up!</h2>
    <p style="text-align:center;color:#9ca3af;">You didn't answer in time. Your streak is lost.</p>
  `;
  processResult(false);
}

async function submitAnswer() {
  clearInterval(timerInterval);
  const isCorrect = selectedAnswer === 'number'; // The correct answer
  await processResult(isCorrect);
}

async function processResult(isCorrect) {
  document.getElementById('quizArea').style.display = 'none';
  const resultArea = document.getElementById('resultArea');
  resultArea.style.display = 'block';
  
  const icon = document.getElementById('resultIcon');
  const title = document.getElementById('resultTitle');
  const text = document.getElementById('resultText');
  
  if (isCorrect) {
    icon.textContent = '🏆';
    title.textContent = 'Correct Answer!';
    title.style.color = '#10b981';
    text.textContent = 'You earned +10 ELO and increased your streak!';
    
    // Update ELO and Streak
    const newElo = studentData.elo + 10;
    const newStreak = studentData.streak + 1;
    
    await updateStudentData({ elo: newElo, streak: newStreak });
  } else {
    icon.textContent = '❌';
    title.textContent = 'Incorrect!';
    title.style.color = '#ef4444';
    text.textContent = 'You lost 5 ELO and your streak has been reset.';
    
    const newElo = Math.max(0, studentData.elo - 5);
    const newStreak = 0;
    
    await updateStudentData({ elo: newElo, streak: newStreak });
  }
}

async function updateStudentData(updates) {
  try {
    const response = await fetch(`${API_URL}/students/${encodeURIComponent(studentData.name)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    // Fire off elo/update to create history event
    await fetch(`${API_URL}/elo/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: studentData.name,
        matchId: "Daily_Challenge_" + new Date().toISOString().slice(0,10),
        oldElo: studentData.elo,
        newElo: updates.elo,
        volatility: 1,
        opponentTier: "Daily",
        performance: updates.elo >= studentData.elo ? "Great Move" : "Blunder"
      })
    });
  } catch(e) {
    console.error("Failed to update", e);
  }
}
