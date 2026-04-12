// ── Factor calculations for prediction ──
function factors(s){
    const acc = parseFloat(s.accuracy) || 0;
    const stk = parseInt(s.streak) || 0;
    const spd = parseFloat(s.speed) || 0;
    const act = parseInt(s.activity) || 0;
    
    return[
      {name:"Accuracy",val:acc,color:"#4a9fd4",weight:"40%"},
      {name:"Streak",val:Math.min(stk*8,100),color:"#f6f669",weight:"30%"},
      {name:"Speed",val:spd*10,color:"#81b64c",weight:"20%"},
      {name:"Activity",val:act,color:"#62b0e8",weight:"10%"},
    ];
  }
  window.onload=async function(){
    const name=localStorage.getItem('edurank_current');
    if(!name){window.location.href='index.html';return;}
    const students=await getAllStudents();
    const me=students.find(s=>s.name.toLowerCase()===name.toLowerCase());

    if(me){
      const p=predictStudent(me);
      const f=factors(me);
      document.getElementById('myPred').innerHTML=`
        <div class="my-pred-name">Your Prediction · ${me.name}</div>
        <div class="my-pred-top">
          <div class="my-pred-icon">${p.icon}</div>
          <div>
            <div class="my-pred-label" style="color:${p.color}">${p.label}</div>
            <div class="my-pred-sub">Based on your last 30 days of activity data.</div>
          </div>
        </div>
        <div class="factors-grid">
          ${f.map(x=>`<div class="factor">
            <div class="factor-name">${x.name}</div>
            <div class="factor-bar"><div class="factor-fill" style="width:${x.val}%;background:${x.color}"></div></div>
            <div class="factor-val" style="color:${x.color}">${x.val}%</div>
            <div class="factor-weight">Weight: ${x.weight}</div>
          </div>`).join('')}
        </div>
      `;
    }

    const grid=document.getElementById('classGrid');
    grid.innerHTML=students.map((s,i)=>{
      const p=predictStudent(s);
      const f=factors(s);
      const isYou=s.name.toLowerCase()===name.toLowerCase();
      return`<div class="student-card" style="animation:fadeUp 0.4s ${i*0.07}s ease both;opacity:0">
        ${isYou?'<div class="you-badge">You</div>':''}
        <div class="sc-header">
          <div class="sc-name">${s.name}</div>
          <div class="sc-pred" style="color:${p.color}">${p.icon} ${p.label}</div>
        </div>
        <div class="sc-elo">ELO: ${s.elo} · Quizzes: ${s.quizzes||0}</div>
        <div class="sc-bar-wrap">
          ${f.map(x=>`<div class="sc-factor">
            <div class="sc-factor-name">${x.name}</div>
            <div class="sc-bar"><div class="sc-fill" style="width:${x.val}%;background:${x.color}"></div></div>
            <div class="sc-val">${x.val}%</div>
          </div>`).join('')}
        </div>
      </div>`;
    }).join('');
  };