window.onload=async function(){
    const name=localStorage.getItem('edurank_current');
    if(!name){window.location.href='index.html';return;}
    const me=await getStudent(name);
    if(me && document.getElementById('streakNum')) {
      document.getElementById('streakNum').textContent=me.streak;
    }
  };
