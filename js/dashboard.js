// =============================================
//  EduRank — dashboard.js
//  JavaScript for dashboard.html
// =============================================

// ── Load student data ──
function initStorage() {
  if (!localStorage.getItem('edurank_students')) {
    localStorage.setItem('edurank_students', JSON.stringify([
      {name:"Aman",elo:1842,tier:"Gold",accuracy:94,streak:12,speed:8,activity:90,quizzes:15},
      {name:"Rohit",elo:1720,tier:"Gold",accuracy:75,streak:5,speed:6,activity:70,quizzes:12},
      {name:"Dev",elo:1650,tier:"Silver",accuracy:60,streak:3,speed:5,activity:55,quizzes:10},
      {name:"Vansh",elo:1500,tier:"Silver",accuracy:45,streak:1,speed:4,activity:40,quizzes:7},
      {name:"Dhruv",elo:1300,tier:"Bronze",accuracy:30,streak:0,speed:3,activity:20,quizzes:4},
    ]));
  }
}

function getAllStudents() {
  initStorage();
  return JSON.parse(localStorage.getItem('edurank_students'));
}

function getTier(elo) {
  if (elo >= 2000) return "Diamond";
  if (elo >= 1800) return "Gold";
  if (elo >= 1500) return "Silver";
  if (elo >= 1200) return "Bronze";
  return "Bronze";
}

function getTierColor(tier) {
  return {Diamond:"#00e5ff",Gold:"#f5c842",Silver:"#aab4c8",Bronze:"#cd7f32"}[tier] || "#888";
}

function getTierRange(tier) {
  return {Diamond:[2000,3000],Gold:[1800,2000],Silver:[1500,1800],Bronze:[1000,1500]}[tier] || [1000,1500];
}

function predictStudent(s) {
  let score = (s.accuracy * 0.4) + (Math.min(s.streak * 3, 30) * 0.3) + (s.speed * 4 * 0.2) + (s.activity * 0.1);
  if (score >= 75) return {label:"Excellent", icon:"🌟", color:"#00e5ff"};
  if (score >= 55) return {label:"Good",      icon:"✅", color:"#00d68f"};
  if (score >= 35) return {label:"Average",   icon:"⚠️",  color:"#f5c842"};
  return                  {label:"At Risk",   icon:"🚨", color:"#ff3b5c"};
}

// ── Main init ──
window.onload = function() {
  const name = localStorage.getItem('edurank_current');
  if (!name) { window.location.href = '../index.html'; return; }

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
  const progress = Math.round(((student.elo - from) / (to - from)) * 100);
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
  setTimeout(() => { document.getElementById('progFill').style.width = Math.min(progress, 100) + '%'; }, 300);

  document.getElementById('statAccuracy').textContent = student.accuracy + '%';
  document.getElementById('statStreak').textContent = student.streak;
  document.getElementById('statRank').textContent = rank + (rank===1?'st':rank===2?'nd':rank===3?'rd':'th');

  // LEADERBOARD MINI
  const lbEl = document.getElementById('lbMini');
  lbEl.innerHTML = sortedStudents.slice(0,5).map((s,i) => {
    const isYou = s.name.toLowerCase() === name.toLowerCase();
    return `<div class="lb-row" style="${isYou?'background:rgba(245,200,66,0.05)':''}">
      <div class="lb-rank ${isYou?'you':''}">${i+1}</div>
      <div class="lb-name ${isYou?'you':''}">${s.name}${isYou?' ←':''}</div>
      <div class="lb-elo">${s.elo}</div>
      <div class="lb-tier">${getTier(s.elo)}</div>
    </div>`;
  }).join('');

  // PREDICTION MINI
  const pred = predictStudent(student);
  const factors = [
    {name:'Accuracy', val:student.accuracy, color:'#00e5ff'},
    {name:'Streak',   val:Math.min(student.streak*8, 100), color:'#f5c842'},
    {name:'Speed',    val:student.speed*10, color:'#00d68f'},
    {name:'Activity', val:student.activity, color:'#a855f7'},
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
  window.location.href = '../index.html';
}