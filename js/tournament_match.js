// =============================================
//  EduRank — tournament_match.js
//  Match Interface for tournament_match.html
// =============================================

let currentName = null;
let player1 = null;
let player2 = null;
let isViewing = false;

// ── Init on page load ──
window.onload = async function() {
  const name = localStorage.getItem('edurank_current');
  if (!name) {
    window.location.href = 'index.html';
    return;
  }
  
  currentName = name;
  
  // Get match info from session storage
  player1 = localStorage.getItem('tournament_match_p1');
  player2 = localStorage.getItem('tournament_match_p2');
  isViewing = new URLSearchParams(window.location.search).get('view') === 'true';
  
  if (!player1 || !player2) {
    document.getElementById('emptyState').innerHTML = '<p style="color: white; font-size: 18px;">Invalid match. <a href="tournament.html" style="color: #6366f1;">Go back</a></p>';
    return;
  }
  
  await loadMatchData();
};

// ── Load match data ──
async function loadMatchData() {
  try {
    // Get player data
    const p1Data = await getStudent(player1);
    const p2Data = await getStudent(player2);
    
    if (!p1Data || !p2Data) {
      document.getElementById('emptyState').innerHTML = '<p style="color: white; font-size: 18px;">Player not found.</p>';
      return;
    }
    
    // Get tournament data to find the match
    const tournament = await getTournament();
    const match = tournament.matches.find(m => 
      (m.player1 === player1 && m.player2 === player2) ||
      (m.player1 === player2 && m.player2 === player1)
    );
    
    // Render UI
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('matchInterface').style.display = 'block';
    
    // Header
    document.getElementById('headerStatus').textContent = `${player1} vs ${player2}`;
    
    // Player 1
    document.getElementById('player1Name').textContent = p1Data.name;
    document.getElementById('player1Elo').textContent = `ELO: ${p1Data.elo}`;
    document.getElementById('player1Acc').textContent = p1Data.accuracy + '%';
    document.getElementById('player1Tier').textContent = getTier(p1Data.elo);
    document.getElementById('player1Quiz').textContent = p1Data.quizzes;
    document.getElementById('player1Stats').style.borderLeft = `4px solid ${getTierColor(getTier(p1Data.elo))}`;
    document.getElementById('p1WinText').textContent = `${p1Data.name} Wins`;
    
    // Player 2
    document.getElementById('player2Name').textContent = p2Data.name;
    document.getElementById('player2Elo').textContent = `ELO: ${p2Data.elo}`;
    document.getElementById('player2Acc').textContent = p2Data.accuracy + '%';
    document.getElementById('player2Tier').textContent = getTier(p2Data.elo);
    document.getElementById('player2Quiz').textContent = p2Data.quizzes;
    document.getElementById('player2Stats').style.borderLeft = `4px solid ${getTierColor(getTier(p2Data.elo))}`;
    document.getElementById('p2WinText').textContent = `${p2Data.name} Wins`;
    
    // Show appropriate mode
    if (match && match.result !== null) {
      // Match completed
      showViewMode(match, p1Data, p2Data);
    } else if (!isViewing && (currentName === player1 || currentName === player2)) {
      // Current player can play
      showPlayMode();
    } else {
      // Viewing or match pending
      showViewMode(match, p1Data, p2Data);
    }
    
  } catch (error) {
    console.error('Error loading match:', error);
    document.getElementById('emptyState').innerHTML = '<p style="color: white; font-size: 18px;">Failed to load match data. <a href="tournament.html" style="color: #6366f1;">Go back</a></p>';
  }
}

// ── Show view mode (read-only) ──
function showViewMode(match, p1Data, p2Data) {
  document.getElementById('viewMode').style.display = 'block';
  document.getElementById('playMode').style.display = 'none';
  
  if (match && match.result) {
    const isPlayer1Winner = match.result === player1;
    const isDraw = match.result === 'draw';
    
    let resultIcon = '⏳';
    let resultText = 'Match pending...';
    
    if (isDraw) {
      resultIcon = '🤝';
      resultText = `Match ended in a DRAW`;
    } else if (isPlayer1Winner) {
      resultIcon = '🏆';
      resultText = `${player1} WON!`;
    } else {
      resultIcon = '🏆';
      resultText = `${player2} WON!`;
    }
    
    document.getElementById('resultIcon').textContent = resultIcon;
    document.getElementById('resultText').textContent = resultText;
  }
}

// ── Show play mode (interactive) ──
function showPlayMode() {
  document.getElementById('playMode').style.display = 'block';
  document.getElementById('viewMode').style.display = 'none';
}

// ── Show error message ──
function showError(message) {
  const box = document.getElementById('messageBox');
  box.innerHTML = `<div class="error-message">❌ ${message}</div>`;
  setTimeout(() => {
    box.innerHTML = '';
  }, 5000);
}

// ── Show success message ──
function showSuccess(message) {
  const box = document.getElementById('messageBox');
  box.innerHTML = `<div class="success-message">✅ ${message}</div>`;
  setTimeout(() => {
    box.innerHTML = '';
  }, 5000);
}

// ── Submit match result ──
async function onSubmitMatch(result_type) {
  // Convert result_type to API format
  let finalResult;
  if (result_type === 'player1_wins') {
    finalResult = 'player1_wins';
  } else if (result_type === 'player2_wins') {
    finalResult = 'player2_wins';
  } else {
    finalResult = 'draw';
  }
  
  try {
    // Confirm before submitting
    let confirmMsg = '';
    if (result_type === 'player1_wins') {
      confirmMsg = `${player1} wins this match?`;
    } else if (result_type === 'player2_wins') {
      confirmMsg = `${player2} wins this match?`;
    } else {
      confirmMsg = 'This match ends in a draw?';
    }
    
    if (!confirm(confirmMsg)) {
      return;
    }
    
    // Submit to API
    const result = await submitMatchResult(player1, player2, finalResult);
    
    if (result.status === 'success') {
      showSuccess('Match result submitted!');
      setTimeout(() => {
        window.location.href = 'tournament.html';
      }, 1500);
    } else {
      showError(result.message || 'Failed to submit match result');
    }
  } catch (error) {
    console.error('Submit error:', error);
    showError('Failed to submit match result');
  }
}

// ── Go back ──
function goBack() {
  window.location.href = 'tournament.html';
}
