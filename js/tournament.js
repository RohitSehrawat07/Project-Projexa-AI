// =============================================
//  EduRank — tournament.js
//  Tournament Logic for tournament.html
// =============================================

let currentName = null;
let tournamentData = null;
let refreshInterval = null;

// ── Init on page load ──
window.onload = async function() {
  const name = localStorage.getItem('edurank_current');
  if (!name) {
    window.location.href = 'index.html';
    return;
  }
  
  currentName = name;
  await loadTournamentData();
  
  // Refresh tournament data every 2 seconds
  refreshInterval = setInterval(loadTournamentData, 2000);
};

// ── Load and render tournament data ──
async function loadTournamentData() {
  try {
    const tournament = await getTournament();
    tournamentData = tournament;
    
    if (!tournament) {
      showEmptyState();
      return;
    }
    
    const status = tournament.status;
    
    if (status === 'not_started') {
      renderJoinSection(tournament);
    } else if (status === 'running') {
      renderRunningTournament(tournament);
    }
  } catch (error) {
    console.error('Failed to load tournament:', error);
    showError('Failed to load tournament data. Please refresh.');
  }
}

// ── Render Join Section ──
function renderJoinSection(tournament) {
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('joinSection').style.display = 'block';
  document.getElementById('controlsSection').style.display = 'none';
  document.getElementById('standingsSection').style.display = 'none';
  document.getElementById('matchesSection').style.display = 'none';
  
  const players = tournament.players || [];
  const hasJoined = players.includes(currentName);
  
  // Header
  document.getElementById('headerStatus').textContent = `${players.length} player(s) registered`;
  document.getElementById('tournamentBadge').textContent = 'Waiting to Start';
  document.getElementById('tournamentBadge').className = 'status-badge waiting';
  
  // Players
  document.getElementById('playerCount').textContent = players.length;
  document.getElementById('playersList').innerHTML = players.map(p => `
    <div class="player-chip ${p === currentName ? 'you' : ''}">
      ${p === currentName ? '👤' : '👥'} ${p}${p === currentName ? ' (You)' : ''}
    </div>
  `).join('');
  
  // Buttons
  const joinBtn = document.getElementById('joinBtn');
  const startBtn = document.getElementById('startBtn');
  
  if (hasJoined) {
    document.getElementById('joinMessage').textContent = '✅ You are registered for this tournament!';
    joinBtn.style.display = 'none';
    if (players.length >= 2) {
      startBtn.style.display = 'inline-block';
    } else {
      startBtn.style.display = 'none';
    }
  } else {
    document.getElementById('joinMessage').textContent = 'Register below to participate in the tournament.';
    joinBtn.style.display = 'inline-block';
    startBtn.style.display = 'none';
  }
}

// ── Render Running Tournament ──
async function renderRunningTournament(tournament) {
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('joinSection').style.display = 'none';
  document.getElementById('controlsSection').style.display = 'block';
  document.getElementById('standingsSection').style.display = 'block';
  document.getElementById('matchesSection').style.display = 'block';
  
  // Header
  document.getElementById('headerStatus').textContent = 'Tournament in progress...';
  document.getElementById('tournamentBadge').textContent = 'Active';
  document.getElementById('tournamentBadge').className = 'status-badge active';
  
  // Standings
  try {
    const standings = await getTournamentStandings();
    await renderStandings(standings);
  } catch (error) {
    console.error('Failed to load standings:', error);
  }
  
  // Matches
  const matches = tournament.matches || [];
  await renderMatches(matches);
}

// ── Render Standings Table ──
async function renderStandings(standings) {
  const tbody = document.getElementById('standingsTable');
  
  if (!standings || standings.length === 0) {
    tbody.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">No standings data yet.</div>';
    return;
  }
  
  tbody.innerHTML = standings.map((s, i) => {
    const tier = getTier(s.elo);
    const tierColor = getTierColor(tier);
    const isMe = s.name === currentName;
    
    return `
      <div class="table-row ${isMe ? 'self' : ''}">
        <div class="rank ${i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : ''}">${i + 1}</div>
        <div class="player-name ${isMe ? 'self' : ''}">${isMe ? '👤 ' : ''}${s.name}</div>
        <div class="tier-badge" style="background: ${tierColor}20; color: ${tierColor}; border: 1px solid ${tierColor}40">${tier}</div>
        <div class="elo-value" style="color: ${tierColor}">${s.elo}</div>
        <div class="points-value">${s.points || 0}</div>
      </div>
    `;
  }).join('');
}

// ── Render Matches Grid ──
async function renderMatches(matches) {
  const grid = document.getElementById('matchesGrid');
  
  if (!matches || matches.length === 0) {
    grid.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280; grid-column: 1/-1;">No matches yet.</div>';
    return;
  }
  
  grid.innerHTML = matches.map((m, i) => {
    const isCompleted = m.result !== null;
    const isMyMatch = m.player1 === currentName || m.player2 === currentName;
    
    return `
      <div class="match-card ${isCompleted ? 'completed' : 'pending'}">
        <div class="match-players">
          <div class="player-info">
            <div class="player-info-name ${m.player1 === currentName ? 'self' : ''}">${m.player1}</div>
            <div class="player-info-elo">ELO</div>
          </div>
          <div class="match-vs">VS</div>
          <div class="player-info">
            <div class="player-info-name ${m.player2 === currentName ? 'self' : ''}">${m.player2}</div>
            <div class="player-info-elo">ELO</div>
          </div>
        </div>
        
        <div class="match-result">
          <p>Result</p>
          ${isCompleted ? `
            <div class="result-status ${m.result === 'draw' ? 'draw' : 'completed'}">
              ${m.result === 'draw' ? '🤝 Draw' : `✅ ${m.result} Won`}
            </div>
          ` : `
            <div class="result-status">⏳ Pending</div>
          `}
        </div>
        
        <div class="match-actions">
          ${isMyMatch && !isCompleted ? `
            <button class="btn-play" onclick="goToMatch('${m.player1}', '${m.player2}')">🎮 Play</button>
          ` : `
            <button class="btn-view" onclick="viewMatch('${m.player1}', '${m.player2}')">👁️ View</button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// ── Show Empty State ──
function showEmptyState() {
  document.getElementById('emptyState').style.display = 'block';
  document.getElementById('joinSection').style.display = 'none';
  document.getElementById('controlsSection').style.display = 'none';
  document.getElementById('standingsSection').style.display = 'none';
  document.getElementById('matchesSection').style.display = 'none';
}

// ── Show Error Message ──
function showError(message) {
  const box = document.getElementById('messageBox');
  box.innerHTML = `<div class="error-message">❌ ${message}</div>`;
  setTimeout(() => {
    box.innerHTML = '';
  }, 5000);
}

// ── Show Success Message ──
function showSuccess(message) {
  const box = document.getElementById('messageBox');
  box.innerHTML = `<div class="success-message">✅ ${message}</div>`;
  setTimeout(() => {
    box.innerHTML = '';
  }, 5000);
}

// ── Join Tournament ──
async function onJoinTournament() {
  try {
    const result = await joinTournament(currentName);
    
    if (result.status === 'success') {
      showSuccess(result.message);
      await loadTournamentData();
    } else {
      showError(result.message || 'Failed to join tournament');
    }
  } catch (error) {
    console.error('Join error:', error);
    showError('Failed to join tournament');
  }
}

// ── Start Tournament ──
async function onStartTournament() {
  if (!confirm('Start the tournament? This will generate all matches. You cannot add more players after this.')) {
    return;
  }
  
  try {
    const result = await startTournament();
    
    if (result.status === 'success') {
      showSuccess('Tournament started! ' + result.data.total_matches + ' matches generated.');
      await loadTournamentData();
    } else {
      showError(result.message || 'Failed to start tournament');
    }
  } catch (error) {
    console.error('Start error:', error);
    showError('Failed to start tournament');
  }
}

// ── Reset Tournament ──
async function onResetTournament() {
  if (!confirm('Reset tournament? All data will be cleared.')) {
    return;
  }
  
  try {
    const result = await resetTournament();
    
    if (result.status === 'success') {
      showSuccess('Tournament reset!');
      await loadTournamentData();
    } else {
      showError('Failed to reset tournament');
    }
  } catch (error) {
    console.error('Reset error:', error);
    showError('Failed to reset tournament');
  }
}

// ── Navigate to Match ──
function goToMatch(player1, player2) {
  localStorage.setItem('tournament_match_p1', player1);
  localStorage.setItem('tournament_match_p2', player2);
  window.location.href = 'tournament_match.html';
}

// ── View Match Details ──
function viewMatch(player1, player2) {
  localStorage.setItem('tournament_match_p1', player1);
  localStorage.setItem('tournament_match_p2', player2);
  window.location.href = 'tournament_match.html?view=true';
}

// ── Go Back ──
function goBack() {
  if (refreshInterval) clearInterval(refreshInterval);
  window.location.href = 'dashboard.html';
}

// ── Cleanup on unload ──
window.onbeforeunload = function() {
  if (refreshInterval) clearInterval(refreshInterval);
};
