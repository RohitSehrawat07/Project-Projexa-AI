window.onload=async function(){
    const name=localStorage.getItem('edurank_current');
    if(!name){window.location.href='index.html';return;}
    const students=await getAllStudents();
    const sorted=[...students].sort((a,b)=>b.elo-a.elo);
    const body=document.getElementById('lbBody');
    body.innerHTML=sorted.map((s,i)=>{
      const tier=getTier(s.elo);
      const col=getTierColor(tier);
      const isYou=s.name.toLowerCase()===name.toLowerCase();
      return`<div class="lb-row ${isYou?'you':''}" style="animation-delay:${i*0.06}s">
        <div class="rank ${i===0?'r1':i===1?'r2':i===2?'r3':''}">${i+1}</div>
        <div class="name ${isYou?'you-name':''}">${s.name}${isYou?' ← You':''}</div>
        <div><span class="tier-badge" style="color:${col};border-color:${col}">${tier}</span></div>
        <div class="elo-val" style="color:${col}">${s.elo}</div>
        <div class="acc-val">${s.accuracy}%</div>
        <div class="streak-val">🔥 ${s.streak}</div>
      </div>`;
    }).join('');
  };