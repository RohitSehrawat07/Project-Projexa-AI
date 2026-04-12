// =============================================
//  EduRank — dashboard.js
//  JavaScript for dashboard.html
// =============================================

// ── Get tier range for progress bar ──
function getTierRange(tier) {
  return {
    Diamond:[2000,2500],
    Gold:   [1800,2000],
    Silver: [1500,1800],
    Bronze: [1000,1500]
  }[tier] || [1000,1500];
}

// ── Main init ──
window.onload = async function() {
  const name = localStorage.getItem('edurank_current');
  if (!name) { window.location.href = 'index.html'; return; }

  const student = await getStudent(name);
  
  if (!student) {
    window.location.href = 'index.html';
    return;
  }

  const students = await getAllStudents();
  const tier = getTier(student.elo);
  const tierColor = getTierColor(tier);
  const [from, to] = getTierRange(tier);
  const tierEloMap = {
    'Bronze': [1000, 1200],
    'Silver': [1200, 1400],
    'Gold': [1400, 1600],
    'Platinum': [1600, 1800],
    'Diamond': [1800, 2500]
  };
  const range = tierEloMap[tier] || [1000, 1200];
  const progress = Math.min(Math.max(Math.round(((student.elo - range[0]) / (range[1] - range[0])) * 100), 0), 100);
  const sortedStudents = [...students].sort((a,b) => b.elo - a.elo);
  const rank = sortedStudents.findIndex(s => s.name.toLowerCase() === name.toLowerCase()) + 1;

  // NAV is handled globally by syncUser() now
  
  // WELCOME
  document.getElementById('titleName').textContent = student.name;

  // ELO STRIP
  document.getElementById('eloDisplay').textContent = student.elo.toLocaleString();
  document.getElementById('tierDisplay').textContent = '⬡ ' + tier;
  document.getElementById('tierDisplay').style.color = tierColor;
  document.getElementById('tierDisplay').style.borderColor = tierColor;
  document.getElementById('eloChange').textContent = student.elo >= 1200 ? '▲ Active Player' : '— New Player';
  document.getElementById('progFrom').textContent = tier + ' · ' + range[0];
  document.getElementById('progTo').textContent = (tier === 'Diamond' ? 'Max' : getTier(range[1]+1)) + ' · ' + range[1];
  setTimeout(() => { document.getElementById('progFill').style.width = progress + '%'; }, 300);

  document.getElementById('statAccuracy').textContent = student.accuracy + '%';
  document.getElementById('statStreak').textContent = student.streak;
  document.getElementById('statRank').textContent = rank + (rank===1?'st':rank===2?'nd':rank===3?'rd':'th');

  // LEADERBOARD MINI
  const lbEl = document.getElementById('lbMini');
  lbEl.innerHTML = sortedStudents.slice(0,5).map((s,i) => {
    const isYou = s.name.toLowerCase() === name.toLowerCase();
    return `<div class="lb-row" style="${isYou?'background:rgba(129,182,76,0.05)':''}">
      <div class="lb-rank ${isYou?'you':''}">${i+1}</div>
      <div class="lb-name ${isYou?'you':''}">${s.name}${isYou?' ←':''}</div>
      <div class="lb-elo">${s.elo}</div>
      <div class="lb-tier">${getTier(s.elo)}</div>
    </div>`;
  }).join('');

  // PREDICTION MINI
  const pred = predictStudent(student);
  const factors = [
    {name:'Accuracy', val:student.accuracy, color:'#4a9fd4'},
    {name:'Streak',   val:Math.min(student.streak*8, 100), color:'#f6f669'},
    {name:'Speed',    val:student.speed*10, color:'#81b64c'},
    {name:'Activity', val:student.activity, color:'#62b0e8'},
  ];
  document.getElementById('predMini').innerHTML = `
    <div class="pred-result">
      <div class="pred-icon">${pred.icon}</div>
      <div>
        <div class="pred-label" style="color:${pred.color}">${pred.label}</div>
        <div class="pred-sub">Based on your recent activity and performance data.</div>
      </div>
    </div>
    <div class="pred-bar-wrap">
      ${factors.map(f => `
        <div class="pred-factor">
          <div class="pred-factor-name">${f.name}</div>
          <div class="pred-factor-bar"><div class="pred-factor-fill" style="width:${f.val}%;background:${f.color}"></div></div>
          <div class="pred-factor-val">${f.val}%</div>
        </div>
      `).join('')}
    </div>
  `;
};

function doLogout() {
  localStorage.removeItem('edurank_current');
  window.location.href = 'index.html';
}