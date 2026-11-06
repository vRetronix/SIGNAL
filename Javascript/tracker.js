/* Signal — Copyright (C) 2026 Retronix. SPDX-License-Identifier: GPL-3.0-only. See LICENSE. */
/* Content Tracker: daily and weekly tasks, 90-day grid, cycles, recap image. */
const TASKS={
  daily:[['Make','Create one piece of content or go live'],['Ship','Post it, plus one cut or clip to another platform'],['Connect','Reply to comments and chat, support 5 creators your size']],
  weekly:['Publish one anchor: a long video or a stream special','Turn it into 3 shorts or clips','Add 5 ideas to the Idea Vault','Review your best and worst posts and streams'],
  monthly:['Compare your numbers to your baseline','Keep what grew, fix what stalled','Set next month’s one focus','Update your schedule and clean out the Idea Vault'],
  setup:['Pick your home base platform','Pick 3 other platforms to post clips and cuts','Write your 3 content pillars','Fill the Idea Vault with 30 ideas','Lock your posting and stream days','Automate folders, file naming and a clip hotkey','Snapshot where you\u2019re starting, to look back on later']
};
const RESET_TASKS=['Read back last cycle’s wins and notes','Update your daily and weekly tasks','Pick one skill to level up this cycle','Re-sort the Idea Vault and drop stale ideas','Confirm your posting and stream days'];
const PHASES=[['Build the habit','Show up every day. Small and done beats big and skipped.'],['Sharpen','Same schedule. Make each piece a little better than the last.'],['Stretch','Keep the basics running and try one new thing each week.']];
const GROWTH=['Try a new hook in the first 3 seconds','Rework one thumbnail or title and see how it lands','Watch your best piece back and note why it worked','Find where viewers dropped off in one video and why','Clip a moment you’d normally skip','Try a new stream segment, game or overlay','Post at a different time and note the difference','Study one creator a step ahead of you','Reply to every comment on one post','Raid, host or collab with someone new','Improve your audio or lighting one step','Plan a stream or script tighter than usual','Turn an old idea into a new format','Ask your audience what they want next','Cut one video shorter than feels comfortable','Add captions to every short this week','Look at your top 3 posts and find what they share','Try one trend or format that fits your style','Refresh your banner, bio or panels','Batch-record two pieces in one session','Plan next week before it starts','Use a platform feature you haven’t tried','Take a planning day: no posting, just prep','Write down one thing your community loves about you'];
const REVIEW_QS=['What did you show up for most consistently?','What got better? Your content, your process, or a number that moved.','What will you practice next month?'];
const DEF_TASKS={
  daily:[{id:'d1',k:'Create',d:'Record, Edit, or Go Live'},{id:'d2',k:'Post',d:'Publish a video, short or clip'},{id:'d3',k:'Engage',d:'Reply to comments and chat, support 5 creators'}],
  weekly:[{id:'w1',k:'Go live on your stream days',d:''},{id:'w2',k:'Publish one long-form video',d:''},{id:'w3',k:'Post 3 or more shorts or clips',d:''},{id:'w4',k:'Add 5 ideas to the Idea Vault',d:''},{id:'w5',k:'Look back on the week: what worked, what to try next',d:''}]};
const cloneDef=()=>JSON.parse(JSON.stringify(DEF_TASKS));

function cycleStats(){let d=0;for(let i=1;i<=90;i++)if(full(i))d++;let wk=0,g=0;for(let w=1;w<=12;w++){if(weekArr(w).every(Boolean))wk++;if(growOf(w).d)g++}
  let rv=0;for(let m=1;m<=3;m++)if((state.reviews[m]||{}).done)rv++;return {days:d,best:best(),weeks:wk,growth:g,reviews:rv}}
function streak(){let n=clampDay(dayNum());if(!full(n))n--;let c=0;while(n>=1&&full(n)){c++;n--}return c}
function best(){let b=0,c=0;for(let i=1;i<=90;i++){if(full(i)){c++;if(c>b)b=c}else c=0}return b}

function renderTrack(){
  const dn=dayNum();if(ui.sel==null)ui.sel=clampDay(dn);
  const waiting=!state.example&&state.begun===false;
  $('exBanner').hidden=!(state.example||waiting);
  $('cycleSec').hidden=waiting;$('resetBox').hidden=waiting;if(document.activeElement!==$('start'))$('start').value=state.start;
  // today
  const a=dayArr(ui.sel),nd=a.filter(Boolean).length;
  $('dayTitle').textContent=ui.sel===dn?'Today':dayDate(ui.sel).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  const nT=TK('daily').length;
  if(ui.editTasks==='daily')taskEditor($('dayRows'),'daily');
  else taskRows($('dayRows'),'daily',a,i=>{toggleRec(state.days,ui.sel,TK('daily')[i].id);commit();if(full(ui.sel))toast('Day '+ui.sel+' locked in')});
  $('editDaily').textContent=ui.editTasks==='daily'?'Done':'Edit';
  $('dayBar').style.width=(nT?nd/nT*100:0)+'%';
  // stats
  const st=streak(),bs=best();$('sStreak').innerHTML=st+'<small>best '+bs+'</small>';$('sStreakBar').style.width=(bs?Math.min(100,st/bs*100):0)+'%';
  let d=0;for(let i=1;i<=90;i++)if(full(i))d++;$('sDays').innerHTML=d+'<small>/ 90</small>';$('sBar').style.width=(d/90*100)+'%';
  // week of the selected day
  const mo=Math.ceil(ui.sel/30),wi=Math.min(3,Math.floor(((ui.sel-1)%30)/7)),w=(mo-1)*4+wi+1,[w1,w2]=weekDays(w),arr=weekArr(w),wd=arr.filter(Boolean).length;
  const nW=TK('weekly').length;$('sWeek').innerHTML=wd+'<small>/ '+nW+'</small>';$('sWeekBar').style.width=(nW?wd/nW*100:0)+'%';
  $('weekTitle').textContent='Week '+w;
  $('weekPill').textContent=wd===nW?'Complete':wd+' of '+nW;$('weekPill').className='pill '+(wd===nW?'good':wd?'warn':'');
  if(ui.editTasks==='weekly')taskEditor($('weekList'),'weekly');
  else taskRows($('weekList'),'weekly',arr,i=>{toggleRec(state.weeks,w,TK('weekly')[i].id);commit();if(weekArr(w).every(Boolean))toast('Week '+w+' complete')});
  $('editWeekly').textContent=ui.editTasks==='weekly'?'Done':'Edit';
  // month review only shows in the last week of each month
  // phase for this month of the cycle
  {const ph=PHASES.at(mo-1);$('phaseBar').innerHTML='<span class="segs">'+[1,2,3].map(m=>'<i class="'+(m===mo?'on':m<mo?'past':'')+'"></i>').join('')+'</span><b><small>Month '+mo+'</small>'+ph[0]+'</b>'}
  // growth focus: one small improvement per week, optional
  {const g=growOf(w),gr=$('growRow');gr.innerHTML='<button class="tk" id="growTk" aria-pressed="'+!!g.d+'"><span class="cb"></span><span class="tx"><b>Growth focus</b><span>'+esc(growText(w))+'</span></span></button><button class="link" id="growSwap" type="button">Swap</button>';
    $('growTk').onclick=()=>{const x=Object.assign({},growOf(w));x.d=x.d?0:1;state.grow[w]=x;commit();if(x.d)toast('Growth focus done. That’s how you get better.')};
    $('growSwap').onclick=()=>{const x=Object.assign({},growOf(w));x.o=(x.o||0)+1;x.d=0;state.grow[w]=x;commit()}}
  // month reflection, shown in the last week of each month
  const showRev=wi===3;$('reviewBox').hidden=!showRev;const revDue=showRev&&!(state.reviews[mo]||{}).done;
  if(showRev){const rv=state.reviews[mo]||{a:[]},md=!!rv.done;$('reviewBox').className='review'+(md?' done':'');
    $('monthTitle').textContent='Month '+mo+' review';
    const qs=REVIEW_QS.slice();if(mo===3)qs[2]='What will you carry into the next cycle?';
    const box=$('monthQs');if(!box.contains(document.activeElement)){box.innerHTML='';
      qs.forEach((q,i)=>{const l=document.createElement('label');l.innerHTML=esc(q)+'<textarea class="inp" rows="2" id="rq-'+i+'"></textarea>';const ta=l.querySelector('textarea');ta.value=(rv.a||[])[i]||'';
        ta.addEventListener('input',e=>{const r=Object.assign({a:[]},state.reviews[mo]);r.a=(r.a||[]).slice();r.a[i]=e.target.value;state.reviews[mo]=r;save()});box.appendChild(l)})}
    $('monthDone').textContent=md?'Reviewed ✓':'Mark reviewed';
    $('monthDone').onclick=()=>{const r=Object.assign({a:[]},state.reviews[mo]);r.done=!r.done;state.reviews[mo]=r;commit();if(r.done)toast('Month '+mo+' reviewed')}}
  // cycle complete
  {const over=dn>90&&!state.example&&!waiting,cc=$('cycleCard');cc.hidden=!over;
    if(over){const cs=cycleStats(),prev=state.history.at(-1),diff=(k)=>prev?(cs[k]-prev[k]):null,tag=(k)=>{const d=diff(k);return d===null?'':d>0?'<span class="up">+'+d+' vs Cycle '+prev.n+'</span>':'<span class="dn">'+(d===0?'same as':d+' vs')+' Cycle '+prev.n+'</span>'};
      $('cycTitle').textContent='Cycle '+state.cycle+' complete';$('cycNext').textContent='Start Cycle '+(state.cycle+1);
      $('cycStats').innerHTML='<div><span class="lbl">Days</span><b>'+cs.days+'<small style="font-size:13px;color:var(--dim)"> / 90</small></b>'+tag('days')+'</div><div><span class="lbl">Best streak</span><b>'+cs.best+'</b>'+tag('best')+'</div><div><span class="lbl">Full weeks</span><b>'+cs.weeks+'<small style="font-size:13px;color:var(--dim)"> / 12</small></b>'+tag('weeks')+'</div><div><span class="lbl">Growth</span><b>'+cs.growth+'</b>'+tag('growth')+'</div>';
      const pg=$('p-track'),an=$('exBanner');if(cc.previousElementSibling!==an)an.after(cc)}}
  // past cycles
  {const hc=$('historyBox');hc.hidden=!state.history.length;
    if(state.history.length){const rows=state.history.slice().reverse().map(h=>'<div class="hrow"><div class="hn"><b>Cycle '+h.n+' <button class="link" type="button" data-recap="'+h.n+'">Recap</button></b><span>'+fmt(parse(h.start))+' – '+fmt(parse(h.end))+'</span></div><div class="hw">'+(h.win?'“'+esc(h.win)+'”':'')+'</div><div class="hb">'+h.days+' / 90 days<div class="bar"><i style="width:'+(h.days/90*100)+'%"></i></div></div></div>');
      const cs=cycleStats();rows.unshift('<div class="hrow now"><div class="hn"><b>Cycle '+state.cycle+'</b><span>Now</span></div><div class="hw"></div><div class="hb">'+cs.days+' / 90 days<div class="bar"><i style="width:'+(cs.days/90*100)+'%;background:var(--munsell-hi)"></i></div></div></div>');
      $('histList').innerHTML=rows.join('')}}
  // 90-day grid
  const h=$('heat');h.innerHTML='';
  for(let m=1;m<=3;m++){const row=document.createElement('div');row.className='mrow';row.innerHTML='<span class="cap">Month '+m+'</span><div class="cells"></div>';const c=row.querySelector('.cells');
    for(let i=(m-1)*30+1;i<=m*30;i++){const da=dayArr(i),n0=da.filter(Boolean).length,n=n0===0?0:n0===da.length?3:(n0/da.length>=.5?2:1),b=document.createElement('button');
      b.className='d'+(n?' l'+n:'')+(i>dn&&!n?' fut':'')+(i===dn?' now':'')+(i===ui.sel?' sel':'');b.textContent=i;
      b.setAttribute('aria-label','Day '+i+', '+n0+' of '+da.length+' done');b.onclick=()=>{ui.sel=i;render();toTop()};c.appendChild(b)}
    h.appendChild(row)}
  // setup
  const SL=setupList(),nS=SL.length;if(state.setup.length!==nS)state.setup=SL.map((_,i)=>state.setup[i]||0);
  const sd=state.setup.filter(Boolean).length,sc=$('cycleSec'),done=sd===nS,rc=state.cycle>1;
  $('cycSecTitle').textContent='Cycle '+state.cycle;
  {const pill=$('cycSecPill'),txt=!done?sd+' of '+nS:revDue?'Review':'';pill.hidden=!txt;pill.textContent=txt;pill.className='pill warn'}
  $('setupTitle').textContent=rc?'Reset for Cycle '+state.cycle:'Get Started';$('setupTitle').hidden=done;$('setupList').hidden=done;
  // until setup is done the Cycle section sits at the top, open; after that it folds away at the bottom
  const pg=$('p-track'),anchor=$('exBanner');
  if(!done&&sc.previousElementSibling!==anchor)anchor.after(sc);
  if(done&&pg.lastElementChild!==sc)pg.appendChild(sc);
  sc.classList.toggle('first',!done);
  if(!renderTrack.once||ui.openSetup){sc.open=!done;renderTrack.once=true;ui.openSetup=false}
  ckList($('setupList'),SL,state.setup,(k,v)=>{state.setup[k]=v;commit();if(v&&state.setup.every(Boolean))toast((rc?'Reset done. Cycle '+state.cycle+' starts ':'Setup Week done. Day 1 starts ')+fmt(parse(state.start)))},'s-');
}

// 90-day recap: a 1080x1350 image of a finished cycle, drawn on canvas
function recapData(h){if(h)return {n:h.n,start:h.start,end:h.end,days:h.days,best:h.best||0,posts:h.posts!=null?h.posts:doneIn(h.start,h.end).length,grid:h.grid||''};
  const end=iso(addDays(parse(state.start),89));return {n:state.cycle,start:state.start,end,days:cycleStats().days,best:best(),posts:doneIn(state.start,end).length,grid:[...Array(90)].map((_,i)=>full(i+1)?1:0).join('')}}
function drawRecap(R){const W=1080,H=1350,P=88,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d'),F=getComputedStyle(document.body).fontFamily;
  const rr=(X,Y,w,h,r)=>{x.beginPath();if(x.roundRect)x.roundRect(X,Y,w,h,r);else x.rect(X,Y,w,h)};
  x.fillStyle='#141412';x.fillRect(0,0,W,H);
  let g=x.createRadialGradient(W*.9,0,0,W*.9,0,900);g.addColorStop(0,'rgba(58,147,180,.30)');g.addColorStop(1,'rgba(58,147,180,0)');x.fillStyle=g;x.fillRect(0,0,W,H);
  g=x.createRadialGradient(0,H,0,0,H,800);g.addColorStop(0,'rgba(227,184,90,.12)');g.addColorStop(1,'rgba(227,184,90,0)');x.fillStyle=g;x.fillRect(0,0,W,H);
  x.save();x.translate(P,P-8);x.scale(2.2,2.2);x.lineCap='round';x.lineWidth=3.2;
  x.strokeStyle='#3A93B4';x.stroke(new Path2D('M6 20c0-6 4-11 11-11h6'));x.strokeStyle='#55AECF';x.stroke(new Path2D('M26 12c0 6-4 11-11 11H9'));
  x.fillStyle='#E3B85A';x.beginPath();x.arc(16,16,2.4,0,Math.PI*2);x.fill();x.restore();
  x.textBaseline='alphabetic';if('letterSpacing' in x)x.letterSpacing='6px';x.fillStyle='#E3B85A';x.font='700 38px '+F;x.fillText('SIGNAL',P+88,P+46);if('letterSpacing' in x)x.letterSpacing='0px';
  x.textAlign='right';x.fillStyle='#A8A499';x.font='600 32px '+F;x.fillText('Cycle '+R.n,W-P,P+46);x.textAlign='left';
  const dL=k=>parse(k).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
  x.fillStyle='#A8A499';x.font='600 34px '+F;x.fillText(dL(R.start)+' – '+dL(R.end),P,300);
  x.fillStyle='#ECEAE4';x.font='700 230px '+F;x.fillText(R.days,P,520);const w=x.measureText(String(R.days)).width;
  x.fillStyle='#77736A';x.font='600 76px '+F;x.fillText('/ 90',P+w+24,520);
  x.fillStyle='#ECEAE4';x.font='600 46px '+F;x.fillText('days complete',P,592);
  const tw=(W-2*P-32)/2;[['Best streak',R.best,'days','#E3B85A'],['Posts shipped',R.posts,'','#55AECF']].forEach(([l,v,u,col],i)=>{const X=P+i*(tw+32),Y=660;
    rr(X,Y,tw,200,22);x.fillStyle='rgba(255,255,255,.05)';x.fill();x.strokeStyle='rgba(255,255,255,.10)';x.lineWidth=2;x.stroke();
    x.fillStyle=col;x.fillRect(X+36,Y+40,40,6);x.fillStyle='#A8A499';x.font='600 30px '+F;x.fillText(l,X+36,Y+92);
    x.fillStyle='#ECEAE4';x.font='700 84px '+F;x.fillText(v,X+36,Y+172);if(u){const vw=x.measureText(String(v)).width;x.fillStyle='#77736A';x.font='600 34px '+F;x.fillText(u,X+36+vw+14,Y+172)}});
  if(R.grid){const cs=48,gp=10,gx=P+(W-2*P-(15*cs+14*gp))/2,gy=920;
    for(let i=0;i<90;i++){const cx=gx+(i%15)*(cs+gp),cy=gy+Math.floor(i/15)*(cs+gp);rr(cx,cy,cs,cs,10);x.fillStyle=R.grid[i]==='1'?'#3A93B4':'rgba(255,255,255,.07)';x.fill()}}
  return c}
function openRecap(h){const R=recapData(h),c=drawRecap(R);ui.recap={c,n:R.n};const im=$('recapImg');
  try{im.src=c.toDataURL('image/png')}catch(e){}im.alt='Cycle '+R.n+' recap: '+R.days+' of 90 days, best streak '+R.best+', '+R.posts+' posts';
  $('recapTitle').textContent='Cycle '+R.n;$('recapModal').hidden=false;$('recapSave').focus()}
const closeRecap=()=>{ui.recap=null;$('recapModal').hidden=true};
$('recapClose').onclick=closeRecap;$('recapModal').addEventListener('click',e=>{if(e.target.id==='recapModal')closeRecap()});
$('recapSave').onclick=()=>{const R=ui.recap;if(!R)return;R.c.toBlob(b=>{if(!b)return;const name='signal-cycle-'+R.n+'.png',f=new File([b],name,{type:'image/png'});
  if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f]}).catch(()=>{});
  else{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}},'image/png')};
$('cycRecap').onclick=()=>openRecap(null);
$('histList').addEventListener('click',e=>{const b=e.target.closest('[data-recap]');if(b)openRecap(state.history.find(h=>String(h.n)===b.dataset.recap))});


function taskRows(el,kind,arr,onTap){el.innerHTML='';
  TK(kind).forEach((t,i)=>{const b=document.createElement('button');b.className='tk';b.id=(kind==='daily'?'task-':'wtask-')+i;b.setAttribute('aria-pressed',!!arr[i]);
    b.innerHTML='<span class="cb"></span><span class="tx"><b>'+esc(t.k)+'</b>'+(t.d?'<span>'+esc(t.d)+'</span>':'')+'</span>';b.onclick=()=>onTap(i);el.appendChild(b)})}
function taskEditor(el,kind){el.innerHTML='';const L=TK(kind);
  L.forEach((t,i)=>{const r=document.createElement('div');r.className='tke';
    r.innerHTML='<span class="mv"><button type="button" aria-label="Move up"'+(i===0?' disabled':'')+'>▲</button><button type="button" aria-label="Move down"'+(i===L.length-1?' disabled':'')+'>▼</button></span><input class="inp tkn" aria-label="Task name" value="'+esc(t.k)+'" placeholder="Task name"><input class="inp tkd" aria-label="Details" value="'+esc(t.d||'')+'" placeholder="Details (optional)"><button class="link danger" type="button"'+(L.length<2?' disabled':'')+'>Remove</button>';
    const [up,dn]=r.querySelectorAll('.mv button');
    up.onclick=()=>{L.splice(i-1,0,L.splice(i,1)[0]);commit()};dn.onclick=()=>{L.splice(i+1,0,L.splice(i,1)[0]);commit()};
    r.querySelector('.tkn').addEventListener('change',e=>{t.k=e.target.value.trim()||t.k;e.target.value=t.k;save()});
    r.querySelector('.tkd').addEventListener('change',e=>{t.d=e.target.value.trim();save()});
    r.querySelector('.danger').onclick=()=>{if(L.length<2)return;L.splice(i,1);commit();toast('Task removed')};
    el.appendChild(r)});
  const f=document.createElement('div');f.className='tkfoot';
  f.innerHTML='<button class="link" type="button" data-add>+ Add task</button><span class="acts"><button class="link" type="button" data-reset>Reset to defaults</button><button class="btn blue sm" type="button" data-done>Done</button></span>';
  f.querySelector('[data-add]').onclick=()=>{L.push({id:uid(),k:'New task',d:''});commit();setTimeout(()=>{const ins=el.querySelectorAll('.tke .tkn');const last=ins[ins.length-1];if(last){last.focus();last.select()}},0)};
  f.querySelector('[data-reset]').onclick=()=>{state.tasks[kind]=cloneDef()[kind];commit();toast('Tasks reset')};
  f.querySelector('[data-done]').onclick=()=>{ui.editTasks=null;render()};
  el.appendChild(f)}


function resetBox(){const b=$('resetBox');b.innerHTML='<button class="link" id="resetBtn">Start over</button>';
  $('resetBtn').onclick=()=>{b.innerHTML='<span class="lbl">Clear everything?</span><button class="btn blue sm" id="resetYes">Yes, start over</button><button class="link" id="resetNo">Cancel</button>';
    $('resetYes').onclick=()=>{state=fresh();state.begun=false;ui.sel=null;ui.month=null;ui.tab='track';renderTrack.once=false;resetBox();commit();toTop();toast('Cleared. Tap Start Here when you\u2019re ready')};$('resetNo').onclick=resetBox}}


$('start').onchange=e=>{if(e.target.value){state.start=e.target.value;ui.sel=null;ui.month=null;commit()}};
const go=n=>{ui.sel=clampDay(n);render()};
$('cycNext').onclick=()=>{const cs=cycleStats(),end=iso(addDays(parse(state.start),89));
  state.history.push(Object.assign({n:state.cycle,start:state.start,end,win:$('cycWin').value.trim(),change:$('cycChange').value.trim()},cs,{posts:doneIn(state.start,end).length,grid:[...Array(90)].map((_,i)=>full(i+1)?1:0).join('')}));
  state.cycle++;state.start=iso(today());state.days={};state.weeks={};state.months={};state.reviews={};state.grow={};state.setup=RESET_TASKS.map(()=>0);
  $('cycWin').value='';$('cycChange').value='';ui.sel=null;ui.openSetup=true;commit();toTop();toast('Cycle '+state.cycle+' started. Quick reset first.')};
$('editDaily').onclick=()=>{ui.editTasks=ui.editTasks==='daily'?null:'daily';render()};$('editWeekly').onclick=()=>{ui.editTasks=ui.editTasks==='weekly'?null:'weekly';render()};
$('prevDay').onclick=()=>go(ui.sel-1);$('nextDay').onclick=()=>go(ui.sel+1);$('goToday').onclick=()=>go(dayNum());

$('startFresh').onclick=()=>{state=fresh();state.begun=true;ui.sel=null;ui.month=null;ui.tab='track';renderTrack.once=false;commit();const sc=$('cycleSec');sc.open=true;toTop();setTimeout(()=>{const f=sc.querySelector('input[type=checkbox]');if(f)f.focus({preventScroll:true})},300)};
