/* Signal — Copyright (C) 2026 Retronix. SPDX-License-Identifier: GPL-3.0-only. See LICENSE. */
/* Content Planner: week view, posts and repeating posts. */
function gotoPlan(k,mode){ui.tab='plan';ui.pf='all';ui.weekOff=Math.floor((utc(parse(k))-utc(weekStart(0)))/(7*DAY));ui.pday=k;render();$('scroller').scrollTo(0,0)}

function fmtTime(t){if(!t)return '';const [h,m]=t.split(':').map(Number);const d=new Date(2000,0,1,h,m);return d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}
const weekStart=(off)=>{const t=today();return addDays(t,-t.getDay()+(off||0)*7)};
function weeklyReset(){const cut=iso(weekStart(0));let n=0;
  Object.keys(state.plan).forEach(k=>{if(k>=cut)return;const keep=[];state.plan[k].forEach(x=>{if(x.done)keep.push(x);else{n++;state.ideas.push({id:uid(),text:x.text,types:x.types||[],plats:x.plats||[],status:'Ready To Post',created:Date.now(),example:x.example})}});
    if(keep.length)state.plan[k]=keep;else delete state.plan[k]});
  if(n){save();setTimeout(()=>toast(n+(n===1?' unposted item':' unposted items')+' went back to the Idea Vault'),400)}}


function renderPlan(){
  const M={done:'Posted',verb:'posted'},t=today(),ws=weekStart(ui.weekOff),days=[...Array(7)].map((_,i)=>addDays(ws,i));
  $('weekRange').textContent=fmt(ws)+' – '+fmt(addDays(ws,6));
  const weekItems=[];days.forEach(d=>planOn(iso(d)).forEach(x=>weekItems.push(x)));
  // platform filter chips
  if(ui.pf!=='all'&&!TG('plats').some(x=>x.n===ui.pf))ui.pf='all';
  {const ps=$('pfSel');ps.innerHTML='<option value="all">All platforms ('+weekItems.length+')</option>'+TG('plats').map(({n})=>{const c=weekItems.filter(x=>(x.plats||[]).includes(n)).length;return c||ui.pf===n?'<option value="'+esc(n)+'">'+esc(n)+' ('+c+')</option>':''}).join('');ps.value=ui.pf;ps.classList.toggle('on',ui.pf!=='all')}
  // stats
  const tot=weekItems.length,dn=weekItems.filter(x=>x.done).length,pct=tot?Math.round(dn/tot*100):0;
  $('ringArc').setAttribute('stroke-dasharray',(2*Math.PI*42*pct/100).toFixed(1)+' 264');$('ringPct').textContent=pct+'%';
  $('ringNum').textContent=dn+' of '+tot+' '+M.verb;
  const counts={};weekItems.forEach(x=>(x.plats||[]).forEach(p=>{counts[p]=counts[p]||[0,0];counts[p][0]++;if(x.done)counts[p][1]++}));
  const keys=Object.keys(counts).sort((a,b)=>counts[b][0]-counts[a][0]),mx=Math.max(1,...keys.map(k=>counts[k][0]));
  $('pbars').innerHTML=keys.length?keys.map(k=>{const c=esc(tcol('plats',k));return '<div class="pbar"><span>'+badge(k)+esc(k)+'</span><span class="trk"><i class="all" style="width:'+(counts[k][0]/mx*100)+'%;background:'+c+'"></i><i style="width:'+(counts[k][1]/mx*100)+'%;background:'+c+'"></i></span><em>'+counts[k][1]+'/'+counts[k][0]+'</em></div>'}).join(''):'<span class="note">Nothing planned this week yet. Add items to see your platform breakdown.</span>';
  // day strip (phone)
  const ks=days.map(iso);if(!ui.pday||!ks.includes(ui.pday))ui.pday=ks.includes(iso(t))?iso(t):ks[0];
  const DS=$('dayStrip');DS.innerHTML='';
  days.forEach(d=>{const k=iso(d),its=planOn(k),b=document.createElement('button');
    b.className=k===iso(t)?'today':'';b.setAttribute('aria-pressed',k===ui.pday);b.setAttribute('aria-label',d.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})+', '+its.length+' items');
    b.innerHTML='<small>'+d.toLocaleDateString(undefined,{weekday:'narrow'})+'</small><b>'+d.getDate()+'</b><i class="'+(its.length?(its.every(x=>x.done)?'all':'has'):'')+'"></i>';
    b.onclick=()=>{ui.pday=k;render()};DS.appendChild(b)});
  // calendar
  const W=$('week');W.innerHTML='';
  days.forEach(d=>{const k=iso(d),isT=k===iso(t),items=planOn(k).filter(x=>ui.pf==='all'||(x.plats||[]).includes(ui.pf))
      .sort((a,b)=>(a.done-b.done)||((a.time||'99').localeCompare(b.time||'99')));
    const col=document.createElement('div');col.className='wday'+(isT?' is-today':'')+(k<iso(t)?' past':'')+(k===ui.pday?' sel':'');
    col.innerHTML='<div class="whead"><span><span class="cap">'+d.toLocaleDateString(undefined,{weekday:'short'})+'</span></span><b>'+d.getDate()+'</b></div>'+(items.length?'':'<div class="note" style="text-align:center;padding:14px 0">Nothing planned'+(ui.pf!=='all'?' on '+esc(ui.pf):'')+'</div>');
    items.forEach(it=>{const e=document.createElement('div');e.className='ev'+(it.done?' done':'');e.style.setProperty('--c',tcol('types',(it.types||[])[0]||''));
      e.tabIndex=0;e.setAttribute('role','button');e.setAttribute('aria-label','Edit '+it.text);
      e.innerHTML=(it.time?'<span class="tm"'+(isLive(it)?' title="Stream lock-in time"':'')+'>'+(isLive(it)?lockSvg:clockSvg)+fmtTime(it.time)+'</span>':'')+'<span class="ti">'+(it.rep?'<span class="rp" title="Repeats '+repLabel(it.rep)+'" aria-label="Repeats">↻</span>':'')+esc(it.text)+'</span><span class="tg">'+(it.types||[]).map(ttag).join('')+(it.plats||[]).map(badge).join('')+'</span><button class="tick" aria-label="'+(it.done?'Mark as not '+M.verb:'Mark as '+M.verb)+'"></button>';
      e.querySelector('.tick').onclick=ev=>{ev.stopPropagation();const v=!it.done;setDone(k,it,v);commit();if(v)toast(M.done)};
      const open=()=>openEd({k,it});e.onclick=open;e.onkeydown=ev=>{if(ev.target===e&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();open()}};col.appendChild(e)});
    const a=document.createElement('button');a.className='dadd';a.textContent='+ Add';a.onclick=()=>openEd({date:k});col.appendChild(a);W.appendChild(col)});
}
const isLive=x=>(x.types||[]).includes('Live')||x.mode==='stream';


$('wPrev').onclick=()=>{ui.weekOff--;ui.pday=null;render()};$('wNext').onclick=()=>{ui.weekOff++;ui.pday=null;render()};$('wToday').onclick=()=>{ui.weekOff=0;ui.pday=null;render()};
$('newItem').onclick=()=>{const t=today(),ws=weekStart(ui.weekOff);openEd({date:ui.weekOff===0?iso(t):iso(ws)})};

// swipe between days / weeks on phone
(function(){let x0=null,y0=null;const el=$('week');
  el.addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY},{passive:true});
  el.addEventListener('touchend',e=>{if(x0==null)return;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;x0=null;
    if(Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.5)return;const k=parse(ui.pday||iso(today())),n=addDays(k,dx<0?1:-1),nk=iso(n);
    const ws=weekStart(ui.weekOff);if(n<ws){ui.weekOff--}else if(n>addDays(ws,6)){ui.weekOff++}ui.pday=nk;render()},{passive:true})})();
