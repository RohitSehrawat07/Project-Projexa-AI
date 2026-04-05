window.onload=async function(){
    const name=localStorage.getItem('edurank_current');
    if(!name){window.location.href='index.html';return;}
    const students=await getAllStudents();
    const sorted=[...students].sort((a,b)=>b.elo-a.elo);
    const preds=students.map(s=>predictStudent(s));
    const atRisk=students.filter(
      s => predictStudent(s).label === "At Risk"
    );
    const avgElo=Math.round(students.reduce((a,s)=>a+s.elo,0)/students.length);
    const avgAcc=Math.round(students.reduce((a,s)=>a+s.accuracy,0)/students.length);

    // STATS
    document.getElementById('statsRow').innerHTML=`
      <div class="stat-box s1"><div class="stat-num">${students.length}</div><div class="stat-key">Total Students</div></div>
      <div class="stat-box s2"><div class="stat-num" style="color:var(--red)">${atRisk.length}</div><div class="stat-key">At Risk</div></div>
      <div class="stat-box s3"><div class="stat-num" style="color:var(--green)">${avgAcc}%</div><div class="stat-key">Avg Accuracy</div></div>
      <div class="stat-box s4"><div class="stat-num" style="color:var(--cyan)">${avgElo}</div><div class="stat-key">Avg ELO</div></div>
    `;

    // AT RISK ALERTS
    const alertsEl=document.getElementById('alertsWrap');
    if(atRisk.length===0){
      alertsEl.innerHTML='<div class="no-alerts">✅ No at-risk students detected. Class is performing well.</div>';
    } else {
      alertsEl.innerHTML=atRisk.map(s=>`
        <div class="alert-card">
          <div class="alert-icon">🚨</div>
          <div>
            <div class="alert-name">${s.name} — Needs Attention</div>
            <div class="alert-detail">Accuracy: ${s.accuracy}% · Streak: ${s.streak} days · Activity: ${s.activity}%</div>
          </div>
          <div class="alert-elo">${s.elo}</div>
        </div>
      `).join('');
    }

    // CLASS TABLE
    document.getElementById('classTable').innerHTML=sorted.map((s,i)=>{
      const tier=getTier(s.elo);
      const col=getTierColor(tier);
      const p=predictStudent(s);
      return`<div class="tr" style="animation:fadeUp 0.4s ${i*0.06}s ease both;opacity:0">
        <div class="td-rank">${i+1}</div>
        <div class="td-name">${s.name}</div>
        <div class="td-tier" style="color:${col}">${tier}</div>
        <div class="td-elo" style="color:${col}">${s.elo}</div>
        <div class="td-acc">${s.accuracy}%</div>
        <div class="td-streak">🔥${s.streak}</div>
        <div class="td-quiz">${s.quizzes||0}</div>
        <div class="td-pred" style="color:${p.color}">${p.icon} ${p.label}</div>
      </div>`;
    }).join('');
  };