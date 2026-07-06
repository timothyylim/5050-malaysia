// Homepage live search over the expert database.
(function(){
  var input = document.getElementById('q');
  var results = document.getElementById('results');
  var browse = document.getElementById('browseBlock');
  var countNote = document.getElementById('countNote');
  if(!input) return;
  var DATA = [];
  fetch('assets/data.json').then(function(r){return r.json();}).then(function(d){
    DATA = d.profiles.map(function(p){
      p._hay = (p.name+' '+(p.role||'')+' '+(p.specialisation||'')+' '+
        p.industries.map(function(i){return i.name;}).join(' ')).toLowerCase();
      return p;
    });
  });
  function initials(n){return n.split(/\s+/).filter(Boolean).slice(0,2).map(function(w){return w[0];}).join('').toUpperCase();}
  function esc(s){return (s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function card(p){
    var tags = p.industries.slice(0,3).map(function(i){return '<span class="tag">'+esc(i.name)+'</span>';}).join('');
    return '<a class="person" href="profiles/'+p.slug+'.html">'+
      '<div class="avatar">'+esc(initials(p.name))+'</div>'+
      '<h3>'+esc(p.name)+'</h3>'+
      (p.role?'<div class="role">'+esc(p.role)+'</div>':'')+
      '<div class="tags">'+tags+'</div></a>';
  }
  var t;
  input.addEventListener('input', function(){
    clearTimeout(t); t=setTimeout(run, 120);
  });
  function run(){
    var q = input.value.trim().toLowerCase();
    if(!q){ results.innerHTML=''; results.style.display='none'; browse.style.display=''; countNote.textContent=''; return; }
    var hits = DATA.filter(function(p){return p._hay.indexOf(q)>-1;});
    browse.style.display='none'; results.style.display='';
    countNote.textContent = hits.length+' expert'+(hits.length===1?'':'s')+' matching “'+input.value.trim()+'”';
    results.innerHTML = hits.length ? hits.slice(0,60).map(card).join('')
      : '<div class="empty">No experts found. Try a broader term, or browse by industry below.</div>';
    if(!hits.length){ browse.style.display=''; }
  }
})();
