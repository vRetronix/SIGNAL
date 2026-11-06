/* Signal — Copyright (C) 2026 Retronix. SPDX-License-Identifier: GPL-3.0-only. See LICENSE. */
/* Idea Vault: list and board, search and filter. */
function renderVault(){
  const t=today(),all=state.ideas;
  if(ui.filter!=='all'&&!TG('types').some(x=>x.n===ui.filter))ui.filter='all';
  if(ui.vpf!=='all'&&!TG('plats').some(x=>x.n===ui.vpf))ui.vpf='all';
  const fT=$('fType'),fP=$('fPlat');
  fT.innerHTML='<option value="all">All</option>'+TG('types').map(({n})=>{const c=all.filter(x=>(x.types||[]).includes(n)).length;return c||ui.filter===n?'<option value="'+esc(n)+'">'+esc(n)+' ('+c+')</option>':''}).join('');fT.value=ui.filter;
  fP.innerHTML='<option value="all">All</option>'+TG('plats').map(({n})=>{const c=all.filter(x=>(x.plats||[]).includes(n)).length;return c||ui.vpf===n?'<option value="'+esc(n)+'">'+esc(n)+' ('+c+')</option>':''}).join('');fP.value=ui.vpf;
  const q=ui.q.trim().toLowerCase();
  const base=all.filter(x=>(ui.filter==='all'||(x.types||[]).includes(ui.filter))&&(ui.vpf==='all'||(x.plats||[]).includes(ui.vpf))&&(!q||x.text.toLowerCase().includes(q))).sort((a,b)=>(b.created||0)-(a.created||0));
  $('vv-list').setAttribute('aria-pressed',ui.vview==='list');$('vv-board').setAttribute('aria-pressed',ui.vview==='board');
  {const fS=$('fStage');$('fStageWrap').hidden=ui.vview==='board';fS.innerHTML='<option value="all">All</option>'+STAGES.map(([n])=>'<option value="'+n+'">'+n+' ('+base.filter(x=>stageOf(x)===n).length+')</option>').join('');fS.value=ui.stage}
  {const nf=(ui.filter!=='all')+(ui.vpf!=='all')+(ui.stage!=='all'&&ui.vview==='list'),fb=$('fBtn');fb.textContent=nf?'Filter · '+nf:'Filter';fb.classList.toggle('on',nf>0);fb.setAttribute('aria-expanded',!!ui.fmenu);$('fMenu').hidden=!ui.fmenu;$('fClear').hidden=!nf}
  const list=base.filter(x=>ui.stage==='all'||stageOf(x)===ui.stage);
  $('vList').hidden=ui.vview==='board';$('vBoard').hidden=ui.vview!=='board';
  if(ui.vview==='board')renderBoard(base);
  const L=$('vList');L.innerHTML='';
  if(!list.length)L.innerHTML='<div class="empty">'+(all.length?(ui.stage!=='all'?'No ideas at '+ui.stage+' right now.':'No matches'):'No ideas yet')+'</div>';
  const dayOpts=[...Array(14)].map((_,i)=>addDays(t,i)).map(d=>'<option value="'+iso(d)+'">'+(iso(d)===iso(t)?'Today':d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}))+'</option>').join('');
  list.forEach(it=>{const r=document.createElement('div');r.className='vrow';r.tabIndex=0;r.setAttribute('role','button');r.setAttribute('aria-label','Edit '+it.text);
    const added=it.created?new Date(it.created).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'';
    r.innerHTML='<div><b>'+esc(it.text)+'</b>'+(it.desc?'<span class="desc">'+esc(it.desc)+'</span>':'')+'<div class="meta">'+(it.types||[]).map(ttag).join('')+(it.plats||[]).map(badge).join('')+'</div></div><div class="stcell">'+stSelect(stageOf(it),'st-'+it.id)+'</div>'+
      '<div class="end"><button class="link" data-edit>Edit</button></div>';
    const stop=e=>e.stopPropagation();r.querySelector('.end').addEventListener('click',stop);r.querySelector('.end').addEventListener('keydown',stop);
    const ss=r.querySelector('.stsel');r.querySelector('.stcell').addEventListener('click',stop);ss.addEventListener('keydown',stop);ss.onchange=e=>{it.status=e.target.value;commit();toast(it.text.slice(0,28)+(it.text.length>28?'…':'')+' → '+e.target.value)};
    const open=()=>openEd({idea:it});
    r.onclick=open;r.onkeydown=e=>{if(e.target===r&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open()}};
    r.querySelector('[data-edit]').onclick=open;
    L.appendChild(r)});
}


function renderBoard(base){
  const B=$('vBoard');B.innerHTML='';const t=today(),dayOpts=[...Array(14)].map((_,i)=>addDays(t,i)).map(d=>'<option value="'+iso(d)+'">'+(iso(d)===iso(t)?'Today':d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}))+'</option>').join('');
  const col=(n,cnt,lock)=>{const c=document.createElement('div');c.className='vcol'+(lock?' lock':'');c.style.setProperty('--c',STCOL[n]);c.innerHTML='<div class="vhead"><b><i></i>'+n+'</b><span class="count" style="margin:0">'+cnt+'</span></div>';return c};
  STAGES.forEach(([n])=>{const items=base.filter(x=>stageOf(x)===n),c=col(n,items.length,false);
    items.forEach(it=>{const k=document.createElement('div');k.className='vcard';k.draggable=true;k.tabIndex=0;k.setAttribute('role','button');k.setAttribute('aria-label','Edit '+it.text);
      k.innerHTML='<b>'+esc(it.text)+'</b><span class="tg">'+(it.types||[]).map(ttag).join('')+(it.plats||[]).map(badge).join('')+(it.example?'<span class="ex">Ex</span>':'')+'</span>'+
        '<span class="kp">'+stSelect(n,'bs-'+it.id)+'</span>';
      const kp=k.querySelector('.kp');kp.addEventListener('click',e=>e.stopPropagation());kp.addEventListener('keydown',e=>e.stopPropagation());
      const ss=k.querySelector('.stsel');if(ss)ss.onchange=e=>{it.status=e.target.value;commit()};
      const open=()=>openEd({idea:it});
      k.onclick=open;k.onkeydown=e=>{if(e.target===k&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open()}};
      k.addEventListener('dragstart',e=>{ui.drag=it.id;k.classList.add('dragging');try{e.dataTransfer.setData('text/plain',it.id);e.dataTransfer.effectAllowed='move'}catch(_){}});
      k.addEventListener('dragend',()=>{ui.drag=null;k.classList.remove('dragging');B.querySelectorAll('.vcol.over').forEach(x=>x.classList.remove('over'))});
      c.appendChild(k)});
    c.addEventListener('dragover',e=>{if(!ui.drag)return;e.preventDefault();c.classList.add('over')});
    c.addEventListener('dragleave',e=>{if(!c.contains(e.relatedTarget))c.classList.remove('over')});
    c.addEventListener('drop',e=>{e.preventDefault();c.classList.remove('over');const it=state.ideas.find(x=>x.id===ui.drag);ui.drag=null;if(it&&stageOf(it)!==n){it.status=n;commit();toast('Moved to '+n)}});
    B.appendChild(c)});
  // Scheduled + Published come from the planner
  const planned=[];Object.keys(state.plan).sort().forEach(k=>state.plan[k].forEach(x=>{if(!x.done)planned.push([k,x])}));
  state.repeats.filter(r=>!r.end||r.end>=iso(t)).forEach(r=>planned.push([r.start>iso(t)?r.start:iso(t),occ(r,'')]));
  const lim=iso(addDays(t,-30));
  const q=ui.q.trim().toLowerCase(),okF=x=>(ui.filter==='all'||(x.types||[]).includes(ui.filter))&&(ui.vpf==='all'||(x.plats||[]).includes(ui.vpf))&&(!q||x.text.toLowerCase().includes(q));
  [['Scheduled',planned.filter(([k,x])=>okF(x))],['Published',doneIn(lim,iso(t)).filter(([k,x])=>okF(x)).reverse()]].forEach(([n,arr])=>{
    const c=col(n,arr.length,true);
    arr.slice(0,40).forEach(([k,x])=>{const b=document.createElement('button');b.className='vcard'+(n==='Published'?' pub':'');b.style.cursor='pointer';
      b.innerHTML='<span class="when">'+(x.rep&&n==='Scheduled'?'↻ '+repLabel(x.rep):parse(k).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}))+'</span><b>'+esc(x.text)+'</b><span class="tg">'+(x.types||[]).map(ttag).join('')+(x.plats||[]).map(badge).join('')+'</span>';
      b.onclick=()=>gotoPlan(k,x.mode);c.appendChild(b)});
    B.appendChild(c)});
}

$('vSearch').addEventListener('input',e=>{ui.q=e.target.value;render()});
$('fType').onchange=e=>{ui.filter=e.target.value;render()};$('fStage').onchange=e=>{ui.stage=e.target.value;render()};$('pfSel').onchange=e=>{ui.pf=e.target.value;render()};
$('fClear').onclick=()=>{ui.filter='all';ui.vpf='all';ui.stage='all';render()};$('fBtn').onclick=()=>{ui.fmenu=!ui.fmenu;render()};
document.addEventListener('click',e=>{if(ui.fmenu&&!e.target.closest('#fMenu,#fBtn')){ui.fmenu=false;render()}});$('fPlat').onchange=e=>{ui.vpf=e.target.value;render()};
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{ui.vview=b.dataset.v;render()});
$('addIdea').onclick=()=>openEd({});
