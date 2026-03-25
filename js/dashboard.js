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
window.onload = function() {
  const name = localStorage.getItem('edurank_current');
  if (!name) { window.location.href = 'index.html'; return; }

  const students = getAllStudents();
  let student = students.find(s => s.name.toLowerCase() === name.toLowerCase());

  // If new student not in list, create them
  if (!student) {
    student = {name, elo:1000, tier:"Bronze", accuracy:0, streak:0, speed:5, activity:0, quizzes:0};
    students.push(student);
    localStorage.setItem('edurank_students', JSON.stringify(students));
  }

  const tier = getTier(student.elo);
  const tierColor = getTierColor(tier);
  const [from, to] = getTierRange(tier);
  const progress = Math.min(Math.max(Math.round(((student.elo - from) / (to - from)) * 100), 0), 100);
  const sortedStudents = [...students].sort((a,b) => b.elo - a.elo);
  const rank = sortedStudents.findIndex(s => s.name.toLowerCase() === name.toLowerCase()) + 1;

  // NAV
  document.getElementById('navName').textContent = student.name;
  document.getElementById('navElo').textContent = student.elo;

  // WELCOME
  document.getElementById('titleName').textContent = student.name;

  // ELO STRIP
  document.getElementById('eloDisplay').textContent = student.elo.toLocaleString();
  document.getElementById('tierDisplay').textContent = '⬡ ' + tier;
  document.getElementById('tierDisplay').style.color = tierColor;
  document.getElementById('tierDisplay').style.borderColor = tierColor;
  document.getElementById('eloChange').textContent = student.elo >= 1000 ? '▲ Active Player' : '— New Player';
  document.getElementById('progFrom').textContent = tier + ' · ' + from;
  document.getElementById('progTo').textContent = (tier === 'Diamond' ? 'Max' : getTier(to+1)) + ' · ' + to;
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