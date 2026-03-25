function predict(s){
    let score=(s.accuracy*0.4)+(Math.min(s.streak*3,30)*0.3)+(s.speed*4*0.2)+(s.activity*0.1);
    if(score>=75)return{label:"Excellent",icon:"🌟",color:"#00e5ff"};
    if(score>=55)return{label:"Good",icon:"✅",color:"#00d68f"};
    if(score>=35)return{label:"Average",icon:"⚠️",color:"#f5c842"};
    return{label:"At Risk",icon:"🚨",color:"#ff3b5c"};
  }
  function factors(s){
    return[
      {name:"Accuracy",val:s.accuracy,color:"#00e5ff",weight:"40%"},
      {name:"Streak",val:Math.min(s.streak*8,100),color:"#f5c842",weight:"30%"},
      {name:"Speed",val:s.speed*10,color:"#00d68f",weight:"20%"},
      {name:"Activity",val:s.activity,color:"#a855f7",weight:"10%"},
    ];
  }
  window.onload=function(){
    const name=localStorage.getItem('edurank_current');
    if(!name){window.location.href='index.html';return;}
    const students=JSON.parse(localStorage.getItem('edurank_students')||'[]');
    const me=students.find(s=>s.name.toLowerCase()===name.toLowerCase());

    if(me){
      const p=predict(me);
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
      const p=predict(s);
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