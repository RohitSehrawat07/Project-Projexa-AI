window.onload=function(){
    const name=localStorage.getItem('edurank_current');
    if(!name){window.location.href='index.html';return;}
    const students=JSON.parse(localStorage.getItem('edurank_students')||'[]');
    const me=students.find(s=>s.name.toLowerCase()===name.toLowerCase());
    if(me && document.getElementById('streakNum')) {
      document.getElementById('streakNum').textContent=me.streak;
    }
  };
