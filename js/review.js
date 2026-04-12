// js/review.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('reviewContainer');
    const dataStr = localStorage.getItem('edurank_last_quiz');
    
    if (!dataStr) {
        container.innerHTML = `
            <div class="stub" style="text-align:center; padding: 3rem;">
              <div class="stub-icon" style="font-size: 4rem; margin-bottom: 1rem;">🔍</div>
              <div class="stub-title" style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;">No Quiz Data Found</div>
              <div class="stub-sub" style="color: var(--muted); margin-bottom: 2rem;">Take a quiz first to review your performance.</div>
              <a href="quiz.html" class="btn" style="background: var(--green); color: white; padding: 0.8rem 1.5rem; border-radius: 5px; text-decoration: none;">Start a Quiz</a>
            </div>
        `;
        return;
    }
    
    try {
        const quiz = JSON.parse(dataStr);
        let html = `
            <div class="review-header" style="text-align: center; margin-bottom: 2rem; padding: 2rem; background: var(--surface); border-radius: 10px; border: 1px solid var(--border);">
                <h2 style="color: var(--green); font-size: 2rem; margin-bottom: 0.5rem; font-family: 'Source Code Pro', monospace;">Score: ${quiz.score} / ${quiz.total}</h2>
                <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem;">Accuracy: ${quiz.percentage.toFixed(0)}%</div>
                <div style="color: var(--muted); font-size: 0.9rem; text-transform: uppercase;">Difficulty: ${quiz.difficulty}</div>
            </div>
            
            <h3 style="margin-bottom: 1rem; color: var(--text);">Question Breakdown</h3>
            <div class="questions-list">
        `;
        
        quiz.questions.forEach((q, index) => {
            // Because we didn't force-save the user's selected index in quiz.js initially, we just show the correct answer dynamically.
            // If we did save selectedOption, we could cross-check. For now, we display the question and the correct option.
            
            html += `
                <div class="question-card" style="background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem;">
                    <div style="font-weight: bold; margin-bottom: 1rem; color: var(--cyan);">Q${index + 1}: ${q.questionText}</div>
                    <ul style="list-style: none; padding: 0;">
                        ${q.options.map((opt, i) => {
                            const isCorrect = i === q.correctAnswer;
                            const color = isCorrect ? 'var(--green)' : 'var(--muted)';
                            const weight = isCorrect ? 'bold' : 'normal';
                            return typeof opt === 'string' 
                                ? `<li style="margin-bottom: 0.5rem; color: ${color}; font-weight: ${weight};">
                                    ${['A','B','C','D'][i]}. ${opt} ${isCorrect ? ' ✓' : ''}
                                   </li>`
                                : '';
                        }).join('')}
                    </ul>
                </div>
            `;
        });
        
        html += `</div>`;
        container.innerHTML = html;
        
    } catch(err) {
        console.error(err);
        container.innerHTML = `<div style="text-align:center; color: var(--red);">Error parsing review data.</div>`;
    }
});
