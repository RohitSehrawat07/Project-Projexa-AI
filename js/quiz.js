let currentName = localStorage.getItem('edurank_current');
let currentDifficulty = 'medium';
let quizQuestions = [];
let currentIndex = 0;
let score = 0;
let timer = 15;
let timerInterval;
let startTime;
let totalTime = 0;
let selectedOption = null;
let isSubmitting = false;

document.addEventListener('DOMContentLoaded', () => {
    if (!currentName) {
        window.location.href = 'index.html';
        return;
    }
});

function startQuiz(difficulty) {
    currentDifficulty = difficulty;
    quizQuestions = [...QUIZ_QUESTIONS[difficulty]];
    // Shuffle
    quizQuestions.sort(() => Math.random() - 0.5);
    
    document.getElementById('difficultySelection').style.display = 'none';
    document.getElementById('quizScreen').style.display = 'block';
    
    startTime = Date.now();
    loadQuestion();
}

function loadQuestion() {
    selectedOption = null;
    timer = 15;
    document.getElementById('nextBtn').disabled = true;
    
    const q = quizQuestions[currentIndex];
    document.getElementById('qCounter').textContent = `Question ${currentIndex + 1} of 5`;
    document.getElementById('qText').textContent = q.q;
    
    const opts = document.getElementById('optionsCont');
    opts.innerHTML = '';
    
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'opt-btn';
        btn.textContent = `${['A','B','C','D'][i]}. ${opt}`;
        btn.onclick = () => selectOption(i, btn);
        opts.appendChild(btn);
    });
    
    startTimer();
}

function startTimer() {
    clearInterval(timerInterval);
    const timeEl = document.getElementById('timer');
    timeEl.textContent = `0:${timer.toString().padStart(2, '0')}`;
    timeEl.style.color = '#81b64c'; // Green
    
    timerInterval = setInterval(() => {
        timer--;
        timeEl.textContent = `0:${timer.toString().padStart(2, '0')}`;
        if (timer <= 5) timeEl.style.color = '#ef4444'; // Red
        
        if (timer <= 0) {
            clearInterval(timerInterval);
            nextQuestion(); // auto step forward if timeout
        }
    }, 1000);
}

function selectOption(index, btnEl) {
    if (selectedOption !== null) return; // Prevent multiple clicks
    selectedOption = index;
    
    // Highlight
    const btns = document.querySelectorAll('.opt-btn');
    btns.forEach(b => b.classList.remove('selected'));
    btnEl.classList.add('selected');
    
    document.getElementById('nextBtn').disabled = false;
    clearInterval(timerInterval); // freeze timer
}

function nextQuestion() {
    if (selectedOption === quizQuestions[currentIndex].correct) {
        score++;
    }
    
    currentIndex++;
    if (currentIndex >= 5) {
        finishQuiz();
    } else {
        loadQuestion();
    }
}

async function finishQuiz() {
    if (isSubmitting) return;
    isSubmitting = true;
    
    const quizData = {
        score: score,
        total: 5,
        percentage: (score / 5) * 100,
        difficulty: currentDifficulty,
        questions: quizQuestions.map((q, i) => ({
            questionText: q.q,
            options: q.options,
            correctAnswer: q.correct,
            // Assuming we track the selected option (currently not saved per question, let's just mark it if needed)
            // for now, we leave it simple.
        }))
    };
    localStorage.setItem("edurank_last_quiz", JSON.stringify(quizData));
    
    totalTime = (Date.now() - startTime) / 1000;
    const avgTime = parseFloat((totalTime / 5).toFixed(2));
    
    document.getElementById('quizScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'block';
    document.getElementById('finalScore').textContent = `${score} / 5`;
    document.getElementById('finalPercent').textContent = `${(score/5)*100}%`;
    document.getElementById('eloGain').textContent = "Calculating...";
    
    // API Submit
    try {
        const res = await fetch(window.location.origin + '/api/quiz/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: currentName,
                correct_answers: score,
                total_questions: 5,
                avg_time: avgTime,
                difficulty: currentDifficulty
            })
        });
        
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        const eloChange = data.elo_change;
        const sign = eloChange >= 0 ? '+' : '';
        const eloEl = document.getElementById('eloGain');
        eloEl.textContent = `${sign}${eloChange} ELO`;
        eloEl.style.color = eloChange >= 0 ? '#81b64c' : '#ef4444';
        
        // ELO Sync as per requirement
        if (typeof syncUser === 'function') {
            await syncUser();
        }
        
    } catch(err) {
        document.getElementById('eloGain').textContent = 'Error updating stats';
        document.getElementById('eloGain').style.color = '#ef4444';
        console.error(err);
    }
}
