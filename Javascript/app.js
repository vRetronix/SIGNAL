/* Signal — Copyright (C) 2026 Retronix. SPDX-License-Identifier: GPL-3.0-only. See LICENSE. */
/* Signal app — one file, four pages.
   State: one object in localStorage (KEY). load() -> fixTasks() migrates old saves; commit() = save() + render().
   Pages: renderTrack (Content Tracker), renderPlan (Content Planner), renderVault (Idea Vault), renderStats (Statistics).
   Data: tasks{daily,weekly}, days{n:{taskId:1}}, weeks{w:{taskId:1}}, reviews, grow, cycle/history,
         plan{iso:[item]}, ideas[], tags{types,plats}, analytics{daily[],content[]}. */
(function(){
const KEY='retronix-signal-v2',OLDKEY='retronix-signal-v1',DAY=864e5;
const PLATFORMS=['Kick','YouTube','TikTok','Shorts','X','Twitch','Discord','Instagram'];
const PCOL={Kick:['var(--kick)','K'],YouTube:['var(--youtube)','▶'],TikTok:['var(--tiktok)','T'],Shorts:['var(--youtube)','S'],X:['var(--x)','X'],Twitch:['var(--twitch)','T'],Discord:['var(--discord)','D'],Instagram:['var(--insta)','I'],Email:['var(--gold)','@'],Blog:['var(--munsell-hi)','B'],'Brand deal':['var(--insta)','$']};
const MODES={
  content:{types:['Long video','Short','Clip','Post'],plats:['YouTube','Shorts','TikTok','X','Instagram','Discord'],done:'Posted',todo:'Planned',verb:'posted',noun:'video',newLbl:'New post',stages:[['Ideas','var(--muted)'],['Scripting','var(--gold)'],['Recording & editing','var(--munsell-hi)'],['Ready to post','var(--good)']]},
  stream:{types:['Main stream','Community night','Build stream','Collab stream','Stream special'],plats:['Kick','Twitch','YouTube'],done:'Streamed',todo:'Scheduled',verb:'streamed',noun:'stream',newLbl:'New stream',stages:[['Ideas','var(--muted)'],['Prepping','var(--gold)'],['Ready to stream','var(--good)']]}};
const STREAM_TYPES=MODES.stream.types;
const DEFAULT_TAGS={
  types:[['Long-form','#E5484D'],['Short','#2BE8E0'],['Clip','#F28C38'],['Post','#CFCBC2'],['Live','#53FC18'],['Brand deal','#E1306C'],['Email','#E3B85A'],['Blog','#55AECF'],['Filming','#A78BFA'],['Editing','#F5A524']],
  plats:[['Kick','#53FC18'],['YouTube','#FF2E2E'],['Shorts','#FF6A6A'],['TikTok','#2BE8E0'],['Twitch','#9146FF'],['X','#E9E9E9'],['Instagram','#E1306C'],['Discord','#5865F2']]};
const narrow=()=>{const a=document.getElementById('app');return !!a&&a.clientWidth<=760};
const STAGES=[['Idea','#8C887E'],['Need Started','#A3ACBB'],['Writing','#E3B85A'],['In Production','#55AECF'],['Editing','#E5484D'],['Ready To Post','#F28C38']];
const LATE=[['Scheduled','#A78BFA'],['Published','#5BCB86']];
const STCOL=Object.fromEntries(STAGES.concat(LATE));
const stageOf=x=>STAGES.some(([n])=>n===x.status)?x.status:'Idea';
const stSelect=(cur,id)=>'<select class="stsel" id="'+id+'" aria-label="Status" style="--c:'+STCOL[cur]+'">'+STAGES.map(([n])=>'<option'+(n===cur?' selected':'')+'>'+n+'</option>').join('')+'</select>';
const stPill=n=>'<span class="stpill" style="--c:'+STCOL[n]+'">'+n+'</span>';
function planIdea(it,k){const mode=(it.types||[]).includes('Live')?'stream':'content';
  (state.plan[k]=state.plan[k]||[]).push({id:uid(),mode,text:it.text,desc:it.desc||'',types:(it.types||[]).slice(),plats:(it.plats||[]).slice(),time:mode==='stream'?'20:00':'',done:false,fromStatus:stageOf(it)});
  state.ideas=state.ideas.filter(x=>x!==it);ui.planning=null;commit();toast('Scheduled for '+fmt(parse(k)))}
function gotoPlan(k,mode){ui.tab='plan';ui.pf='all';ui.weekOff=Math.floor((utc(parse(k))-utc(weekStart(0)))/(7*DAY));ui.pday=k;render();$('scroller').scrollTo(0,0)}
const cloneTags=()=>({types:DEFAULT_TAGS.types.map(([n,c])=>({n,c})),plats:DEFAULT_TAGS.plats.map(([n,c])=>({n,c}))});
const TG=k=>state.tags[k];
const tcol=(k,n)=>{const t=TG(k).find(x=>x.n===n);return t?t.c:'#77736A'};
const letter=n=>n==='YouTube'?'▶':n==='Shorts'?'S':n==='Brand deal'?'$':(n[0]||'?').toUpperCase();
const badge=n=>'<span class="badge" style="--c:'+esc(tcol('plats',n))+'" title="'+esc(n)+'">'+esc(letter(n))+'</span>';
const ttag=n=>'<span class="ttag" style="--c:'+esc(tcol('types',n))+'">'+esc(n)+'</span>';
function ideaTypes(x){if(x.types&&x.types.length)return x.types;const t=x.type||'';
  return [x.mode==='stream'||STREAM_TYPES.includes(t)?'Live':t==='Long video'?'Long-form':t==='Short'?'Short':t==='Clip'?'Clip':'Post']}
const ideaPlats=x=>x.plats||(x.platform?[x.platform]:[]);
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
function fixTasks(s){if(!s.tasks)s.tasks=cloneDef();if(!s.analytics)s.analytics=s.example?sampleAnalytics(today()):{daily:[],content:[],example:false};s.cycle=s.cycle||1;s.history=s.history||[];s.reviews=s.reviews||{};s.grow=s.grow||{};(s.tasks.daily||[]).forEach(t=>{if(t.d==='Film, edit or go live')t.d='Record, Edit, or Go Live'});(s.tasks.weekly||[]).forEach(t=>{if(t.k==='Check your numbers and note what worked')t.k='Look back on the week: what worked, what to try next'});
  const conv=(store,kind)=>{Object.keys(store||{}).forEach(n=>{const r=store[n];if(Array.isArray(r)){const o={};r.forEach((v,i)=>{if(v&&DEF_TASKS[kind][i])o[DEF_TASKS[kind][i].id]=1});store[n]=o}})};
  conv(s.days,'daily');conv(s.weeks,'weekly');return s}
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const utc=d=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());
const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const today=()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate())};
const fmt=d=>d.toLocaleDateString(undefined,{month:'short',day:'numeric'});
const uid=()=>Math.random().toString(36).slice(2,9);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const plat=(p,sm)=>{const c=PCOL[p]||[(state&&state.tags?tcol('plats',p):'var(--muted)'),letter(p)];return '<span class="pl'+(sm?' sm':'')+'" style="background:'+c[0]+'" aria-hidden="true">'+c[1]+'</span>'};

function sample(){
  const t=today(),s={v:2,example:true,edition:'streamer',start:iso(addDays(t,-22)),days:{},weeks:{},months:{},setup:[1,1,1,1,1,1,1],pillars:['GTA RP stories','Community nights','Server builds'],ideas:[],plan:{}};
  for(let i=1;i<=22;i++)s.days[i]=i===9?[1,1,0]:i===15?[0,0,0]:i===4?[1,0,1]:i===11?[1,0,0]:[1,1,1];
  s.days[23]=[1,0,0];s.weeks[1]=[1,1,1,1,1];s.weeks[2]=[1,1,1,1,1];s.weeks[3]=[1,0,1,1];s.weeks[4]=[1,0,0,0];
  s.v=3;s.tags=cloneTags();s.cycle=2;s.setup=[1,1,1,1,1];s.reviews={};s.grow={1:{d:1},2:{d:1},3:{o:2}};
  s.history=[{n:1,start:iso(addDays(t,-112)),end:iso(addDays(t,-23)),days:61,best:12,weeks:7,growth:6,win:'Never missed a Tuesday heist night',change:'Cut clips the day after each stream, not at the end of the week'}];
  const SS=['Editing','Idea','Need Started','Ready To Post','In Production','Writing','Idea','Need Started','Writing'];let si=0;
  const d0=Date.now(),ex=(text,types,plats,ago)=>({id:uid(),text,types,plats,status:SS[si++]||'Idea',created:d0-ago*DAY,example:true});
  s.ideas=[ex('Cop chase goes wrong in 10 seconds',['Clip'],['TikTok'],1),ex('First night as a new gang, full story',['Long-form'],['YouTube'],2),ex('Viewers vote the next heist',['Live'],['Kick'],2),
    ex('Community car meet highlights',['Short'],['Shorts','TikTok'],3),ex('Building the new hospital MLO, timelapse',['Long-form'],['YouTube'],4),ex('3 scripts every RP server needs',['Post','Blog'],['X'],5),
    ex('Collab night with another RP streamer',['Live'],['Kick'],6),ex('Pitch a sponsor for the car meet',['Brand deal'],['Instagram'],7),ex('Monthly server update for the Discord',['Email','Post'],['Discord'],9)];
  ['Open on the crash, then rewind 10 seconds. Caption the chat reactions.','Three-act story from the first night. Cut to 12–15 min.','Poll chat at the start, run the winning heist live.','','Two-day build squeezed into a 60 second timelapse.'].forEach((d,i)=>{if(s.ideas[i])s.ideas[i].desc=d});
  const ws=addDays(t,-t.getDay()),d=t.getDay();
  const put=(off,mode,text,types,plats,time)=>{const k=iso(addDays(ws,off));(s.plan[k]=s.plan[k]||[]).push({id:uid(),mode,text,types,plats,time:time||'',done:off<d,example:true})};
  put(0,'content','Schedule graphic for the week',['Post'],['X'],'12:00');put(0,'content','Film heist night intro',['Filming'],['YouTube'],'15:00');
  put(1,'stream','Heist night',['Live'],['Kick'],'20:00');put(1,'content','Edit weekly recap',['Editing'],['YouTube'],'13:00');
  put(2,'content','3 clips from heist night',['Clip'],['TikTok','Shorts'],'15:00');put(2,'stream','Community night',['Live'],['Kick','Twitch'],'20:00');
  put(3,'content','Stream reminder in Retro’s Lounge',['Post'],['Discord'],'18:00');put(3,'content','Sponsor read: energy drink',['Brand deal','Short'],['Instagram'],'16:00');
  put(4,'stream','Hospital MLO build',['Live'],['Kick'],'19:00');put(5,'content','Weekly recap video',['Long-form'],['YouTube'],'17:00');put(5,'content','Recap cut for Shorts',['Short'],['Shorts'],'17:30');
  put(6,'stream','Viewer vote special',['Live','Brand deal'],['Kick'],'20:00');
  return s;
}
function fresh(){return {v:3,analytics:{daily:[],content:[],example:false},cycle:1,history:[],reviews:{},grow:{},tasks:state&&state.tasks?state.tasks:cloneDef(),tags:state&&state.tags?state.tags:cloneTags(),example:false,edition:state?state.edition:'creator',start:iso(today()),days:{},weeks:{},months:{},setup:[0,0,0,0,0,0,0],pillars:['Pillar 1','Pillar 2','Pillar 3'],ideas:[],plan:{}}}
function migrate(s){s.v=2;const m=x=>x.mode||((STREAM_TYPES.includes(x.type)||x.type==='Stream'||x.type==='Collab'||((x.platform==='Kick'||x.platform==='Twitch')&&!x.type))?'stream':'content');
  (s.ideas||[]).forEach(x=>{x.mode=m(x);x.stage=x.stage||0;if(x.mode==='stream'&&!STREAM_TYPES.includes(x.type))x.type='Main stream'});
  Object.values(s.plan||{}).forEach(a=>a.forEach(x=>{x.mode=m(x);x.type=x.type||(x.mode==='stream'?'Main stream':'Post');x.time=x.time||''}));return s}
function toV3(s){s.v=3;s.tags=s.tags||cloneTags();(s.ideas||[]).forEach(x=>{x.types=ideaTypes(x);x.plats=ideaPlats(x);delete x.type;delete x.platform;delete x.mode;delete x.stage;delete x.pillar});
  Object.values(s.plan||{}).forEach(a=>a.forEach(x=>{x.types=ideaTypes(x);x.plats=ideaPlats(x);delete x.type;delete x.platform}));return s}
function load(){try{const r=localStorage.getItem(KEY);if(r){const s=JSON.parse(r);if(s&&s.v===3)return fixTasks(s);if(s&&s.v===2)return fixTasks(toV3(s))}const o=localStorage.getItem(OLDKEY);if(o){const s=JSON.parse(o);if(s&&s.v===1)return fixTasks(toV3(migrate(s)))}}catch(e){}return fixTasks(sample())}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}

let state=load();
const ui={anR:'30',anP:'all',fg:'pct',anSort:'views',anm:null,vview:'list',stage:'all',pday:null,tab:'track',month:null,sel:null,weekOff:0,mode:null,pf:'all',item:null,tags:null,tagKind:'types',filter:'all',vpf:'all',q:'',planning:null,editing:null,editTypes:[],editPlats:[]};
const $=id=>document.getElementById(id);
const T=()=>TASKS;
const dayNum=()=>Math.floor((utc(today())-utc(parse(state.start)))/DAY)+1;
const dayDate=n=>addDays(parse(state.start),n-1);
const TK=k=>state.tasks[k];
const recOf=(store,n)=>{const r=store[n];return r&&!Array.isArray(r)?r:{}};
const dayArr=n=>TK('daily').map(t=>recOf(state.days,n)[t.id]?1:0);
const full=n=>{const a=dayArr(n);return a.length>0&&a.every(Boolean)};
const weekArr=w=>TK('weekly').map(t=>recOf(state.weeks,w)[t.id]?1:0);
const toggleRec=(store,n,id)=>{const r=Object.assign({},recOf(store,n));if(r[id])delete r[id];else r[id]=1;store[n]=r;return !!r[id]};
const monthArr=m=>state.months[m]||[0,0,0,0];
const weekDays=w=>{const m=Math.ceil(w/4),i=(w-1)%4,b=(m-1)*30;return [b+i*7+1,i===3?b+30:b+i*7+7]};
const clampDay=n=>Math.min(90,Math.max(1,n));
const setupList=()=>state.cycle>1?RESET_TASKS:T().setup;
const growOf=w=>state.grow[w]||{};
const growText=w=>GROWTH.at((((state.cycle-1)*12+(w-1)+(growOf(w).o||0))%GROWTH.length+GROWTH.length)%GROWTH.length);
function cycleStats(){let d=0;for(let i=1;i<=90;i++)if(full(i))d++;let wk=0,g=0;for(let w=1;w<=12;w++){if(weekArr(w).every(Boolean))wk++;if(growOf(w).d)g++}
  let rv=0;for(let m=1;m<=3;m++)if((state.reviews[m]||{}).done)rv++;return {days:d,best:best(),weeks:wk,growth:g,reviews:rv}}
function streak(){let n=clampDay(dayNum());if(!full(n))n--;let c=0;while(n>=1&&full(n)){c++;n--}return c}
function best(){let b=0,c=0;for(let i=1;i<=90;i++){if(full(i)){c++;if(c>b)b=c}else c=0}return b}
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('show'),1800)}
function sw(on,label,fn){const b=document.createElement('button');b.className='sw';b.setAttribute('role','switch');b.setAttribute('aria-checked',!!on);b.setAttribute('aria-label',label);b.onclick=fn;return b}
function ckList(ul,items,arr,onSet,pre){ul.innerHTML='';items.forEach((txt,k)=>{const li=document.createElement('li');
  li.innerHTML='<label><input type="checkbox" id="'+pre+k+'"'+(arr[k]?' checked':'')+'><span>'+esc(txt)+'</span></label>';
  li.querySelector('input').onchange=e=>onSet(k,e.target.checked?1:0);ul.appendChild(li)})}

function renderShell(){
  document.querySelectorAll('.bnav button').forEach(b=>{if(b.dataset.tab===ui.tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  {const dn=dayNum();$('topStatus').textContent=(state.cycle>1?'Cycle '+state.cycle+' · ':'')+(dn<1?'Starts in '+(1-dn)+'d':dn>90?'Cycle done':'Day '+dn+' of 90')}
  ['track','plan','vault','stats'].forEach(p=>$('p-'+p).hidden=p!==ui.tab);
}
function renderTrack(){
  const dn=dayNum();if(ui.sel==null)ui.sel=clampDay(dn);
  const waiting=!state.example&&state.begun===false;
  $('exBanner').hidden=!(state.example||waiting);
  $('setupCard').hidden=waiting;$('resetBox').hidden=waiting;if(document.activeElement!==$('start'))$('start').value=state.start;
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
  const showRev=wi===3;$('reviewBox').hidden=!showRev;
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
  {const hc=$('historyCard');hc.hidden=!state.history.length;
    if(state.history.length){const rows=state.history.slice().reverse().map(h=>'<div class="hrow"><div class="hn"><b>Cycle '+h.n+'</b><span>'+fmt(parse(h.start))+' – '+fmt(parse(h.end))+'</span></div><div class="hw">'+(h.win?'“'+esc(h.win)+'”':'')+'</div><div class="hb">'+h.days+' / 90 days<div class="bar"><i style="width:'+(h.days/90*100)+'%"></i></div></div></div>');
      const cs=cycleStats();rows.unshift('<div class="hrow now"><div class="hn"><b>Cycle '+state.cycle+'</b><span>Now</span></div><div class="hw"></div><div class="hb">'+cs.days+' / 90 days<div class="bar"><i style="width:'+(cs.days/90*100)+'%;background:var(--munsell-hi)"></i></div></div></div>');
      $('histList').innerHTML=rows.join('')}}
  // 90-day grid
  const h=$('heat');h.innerHTML='';
  for(let m=1;m<=3;m++){const row=document.createElement('div');row.className='mrow';row.innerHTML='<span class="cap">Month '+m+'</span><div class="cells"></div>';const c=row.querySelector('.cells');
    for(let i=(m-1)*30+1;i<=m*30;i++){const da=dayArr(i),n0=da.filter(Boolean).length,n=n0===0?0:n0===da.length?3:(n0/da.length>=.5?2:1),b=document.createElement('button');
      b.className='d'+(n?' l'+n:'')+(i>dn&&!n?' fut':'')+(i===dn?' now':'')+(i===ui.sel?' sel':'');b.textContent=i;
      b.setAttribute('aria-label','Day '+i+', '+n0+' of '+da.length+' done');b.onclick=()=>{ui.sel=i;render();$('scroller').scrollTo({top:0,behavior:'smooth'})};c.appendChild(b)}
    h.appendChild(row)}
  // setup
  const SL=setupList(),nS=SL.length;if(state.setup.length!==nS)state.setup=SL.map((_,i)=>state.setup[i]||0);
  const sd=state.setup.filter(Boolean).length,sc=$('setupCard'),done=sd===nS,rc=state.cycle>1;
  $('setupPill').textContent=done?'Done':sd+' of '+nS;$('setupPill').className='pill '+(done?'good':'warn');
  $('setupTitle').textContent=rc?(done?'Reset Week':'Reset for Cycle '+state.cycle):(done?'Setup Week':'Get Started');
  // until setup is done it sits at the top of the Tracker; after that it folds away at the bottom
  const pg=$('p-track'),anchor=$('exBanner');
  if(!done&&sc.previousElementSibling!==anchor)anchor.after(sc);
  if(done&&pg.lastElementChild!==sc)pg.appendChild(sc);
  sc.classList.toggle('first',!done);
  if(!renderTrack.once||ui.openSetup){sc.open=!done;renderTrack.once=true;ui.openSetup=false}
  ckList($('setupList'),SL,state.setup,(k,v)=>{state.setup[k]=v;commit();if(v&&state.setup.every(Boolean))toast((rc?'Reset done. Cycle '+state.cycle+' starts ':'Setup Week done. Day 1 starts ')+fmt(parse(state.start)))},'s-');
}
function fmtTime(t){if(!t)return '';const [h,m]=t.split(':').map(Number);const d=new Date(2000,0,1,h,m);return d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}
const weekStart=(off)=>{const t=today();return addDays(t,-t.getDay()+(off||0)*7)};
function weeklyReset(){const cut=iso(weekStart(0));let n=0;
  Object.keys(state.plan).forEach(k=>{if(k>=cut)return;const keep=[];state.plan[k].forEach(x=>{if(x.done)keep.push(x);else{n++;state.ideas.push({id:uid(),text:x.text,types:x.types||[],plats:x.plats||[],status:'Ready To Post',created:Date.now(),example:x.example})}});
    if(keep.length)state.plan[k]=keep;else delete state.plan[k]});
  if(n){save();setTimeout(()=>toast(n+(n===1?' unposted item':' unposted items')+' went back to the Idea Vault'),400)}}
function chip(kind,name,on,n,fn,id){const b=document.createElement('button');b.type='button';b.className='tchip';b.id=id;
  b.style.setProperty('--c',name==='all'?'var(--munsell)':tcol(kind,name));b.setAttribute('aria-pressed',!!on);
  b.innerHTML=(name==='all'?'':'<i></i>')+esc(name==='all'?'All':name)+(n!=null?' <span class="n">'+n+'</span>':'');b.onclick=fn;return b}
const slug=n=>n.replace(/[^a-z0-9]/gi,'');
const toggle=(arr,n)=>arr.includes(n)?arr.filter(x=>x!==n):arr.concat(n);
const lockSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
const clockSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

function renderPlan(){
  const M={done:'Posted',verb:'posted'},t=today(),ws=weekStart(ui.weekOff),days=[...Array(7)].map((_,i)=>addDays(ws,i));
  $('weekRange').textContent=fmt(ws)+' – '+fmt(addDays(ws,6));
  const weekItems=[];days.forEach(d=>(state.plan[iso(d)]||[]).forEach(x=>weekItems.push(x)));
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
  days.forEach(d=>{const k=iso(d),its=(state.plan[k]||[]),b=document.createElement('button');
    b.className=k===iso(t)?'today':'';b.setAttribute('aria-pressed',k===ui.pday);b.setAttribute('aria-label',d.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})+', '+its.length+' items');
    b.innerHTML='<small>'+d.toLocaleDateString(undefined,{weekday:'narrow'})+'</small><b>'+d.getDate()+'</b><i class="'+(its.length?(its.every(x=>x.done)?'all':'has'):'')+'"></i>';
    b.onclick=()=>{ui.pday=k;render()};DS.appendChild(b)});
  // calendar
  const W=$('week');W.innerHTML='';
  days.forEach(d=>{const k=iso(d),isT=k===iso(t),items=(state.plan[k]||[]).filter(x=>ui.pf==='all'||(x.plats||[]).includes(ui.pf))
      .sort((a,b)=>(a.done-b.done)||((a.time||'99').localeCompare(b.time||'99')));
    const col=document.createElement('div');col.className='wday'+(isT?' is-today':'')+(k<iso(t)?' past':'')+(k===ui.pday?' sel':'');
    col.innerHTML='<div class="whead"><span><span class="cap">'+d.toLocaleDateString(undefined,{weekday:'short'})+'</span></span><b>'+d.getDate()+'</b></div>'+(items.length?'':'<div class="note" style="text-align:center;padding:14px 0">Nothing planned'+(ui.pf!=='all'?' on '+esc(ui.pf):'')+'</div>');
    items.forEach(it=>{const e=document.createElement('div');e.className='ev'+(it.done?' done':'');e.style.setProperty('--c',tcol('types',(it.types||[])[0]||''));
      e.tabIndex=0;e.setAttribute('role','button');e.setAttribute('aria-label','Edit '+it.text);
      e.innerHTML=(it.time?'<span class="tm"'+(isLive(it)?' title="Stream lock-in time"':'')+'>'+(isLive(it)?lockSvg:clockSvg)+fmtTime(it.time)+'</span>':'')+'<span class="ti">'+esc(it.text)+'</span><span class="tg">'+(it.types||[]).map(ttag).join('')+(it.plats||[]).map(badge).join('')+'</span><button class="tick" aria-label="'+(it.done?'Mark as not '+M.verb:'Mark as '+M.verb)+'"></button>';
      e.querySelector('.tick').onclick=ev=>{ev.stopPropagation();it.done=!it.done;commit();if(it.done)toast(M.done)};
      const open=()=>openItem(k,it);e.onclick=open;e.onkeydown=ev=>{if(ev.target===e&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();open()}};col.appendChild(e)});
    const a=document.createElement('button');a.className='dadd';a.textContent='+ Add';a.onclick=()=>openItem(k,null);col.appendChild(a);W.appendChild(col)});
  renderItemModal();
}
const isLive=x=>(x.types||[]).includes('Live')||x.mode==='stream';
function openItem(k,it){
  ui.item=it?{id:it.id,orig:k,date:k,text:it.text,types:(it.types||[]).slice(),plats:(it.plats||[]).slice(),time:it.time||'',done:!!it.done,from:''}
    :{id:null,orig:null,date:k,text:'',types:[],plats:[],time:'',done:false,from:''};
  render();setTimeout(()=>$('itText').focus(),0)}
function renderItemModal(){const D=ui.item;$('itemModal').hidden=!D;if(!D)return;const live=D.types.includes('Live'),M={done:live?'Streamed':'Posted'};
  $('itemTitle').textContent=D.id?'Edit '+(live?'stream':'item'):'New item';
  $('fromVaultWrap').hidden=!!D.id||!state.ideas.length;
  if(!D.id){const fv=$('fromVault');fv.innerHTML='<option value="">Start from scratch</option>'+state.ideas.slice().sort((a,b)=>(b.created||0)-(a.created||0)).map(x=>'<option value="'+x.id+'">'+esc(x.text)+'</option>').join('');fv.value=D.from}
  if(document.activeElement!==$('itText'))$('itText').value=D.text;
  $('itDate').value=D.date;$('itTime').value=D.time;$('itTimeLbl').textContent=live?'Lock-in time':'Time';
  const ty=$('itTypes');ty.innerHTML='';TG('types').forEach(({n})=>ty.appendChild(chip('types',n,D.types.includes(n),null,()=>{D.types=toggle(D.types,n);renderItemModal()},'it-t-'+slug(n))));
  const pl=$('itPlats');pl.innerHTML='';TG('plats').forEach(({n})=>pl.appendChild(chip('plats',n,D.plats.includes(n),null,()=>{D.plats=toggle(D.plats,n);renderItemModal()},'it-p-'+slug(n))));
  $('itDone').setAttribute('aria-checked',D.done);$('itDoneLbl').textContent=M.done;$('itDone').setAttribute('aria-label',M.done);
  $('itDel').hidden=!D.id;$('itBack').hidden=!D.id;$('itDel').textContent=$('itDel').dataset.sure?'Tap again to delete':'Delete';
}
function saveItem(){const D=ui.item;const text=$('itText').value.trim();if(!text){toast('Give it a title first');$('itText').focus();return}
  D.date=$('itDate').value||D.date;D.time=$('itTime').value;
  if(D.id){const arr=state.plan[D.orig]||[],it=arr.find(x=>x.id===D.id);if(it){it.mode=D.types.includes('Live')?'stream':'content';state.plan[D.orig]=arr.filter(x=>x!==it);if(!state.plan[D.orig].length)delete state.plan[D.orig];
      Object.assign(it,{text,types:D.types,plats:D.plats,time:D.time,done:D.done,example:false});(state.plan[D.date]=state.plan[D.date]||[]).push(it)}}
  else{(state.plan[D.date]=state.plan[D.date]||[]).push({id:uid(),mode:D.types.includes('Live')?'stream':'content',text,types:D.types,plats:D.plats,time:D.time,done:D.done});
    if(D.from)state.ideas=state.ideas.filter(x=>x.id!==D.from)}
  const off=Math.floor((utc(parse(D.date))-utc(weekStart(0)))/(7*DAY));ui.weekOff=off;ui.item=null;commit();toast('Saved to '+fmt(parse(D.date)))}

function renderVault(){
  const t=today(),all=state.ideas;
  if(ui.filter!=='all'&&!TG('types').some(x=>x.n===ui.filter))ui.filter='all';
  if(ui.vpf!=='all'&&!TG('plats').some(x=>x.n===ui.vpf))ui.vpf='all';
  const fT=$('fType'),fP=$('fPlat');
  fT.innerHTML='<option value="all">'+(narrow()?'Type':'All types')+'</option>'+TG('types').map(({n})=>{const c=all.filter(x=>(x.types||[]).includes(n)).length;return c||ui.filter===n?'<option value="'+esc(n)+'">'+esc(n)+' ('+c+')</option>':''}).join('');fT.value=ui.filter;
  fP.innerHTML='<option value="all">'+(narrow()?'Platform':'All platforms')+'</option>'+TG('plats').map(({n})=>{const c=all.filter(x=>(x.plats||[]).includes(n)).length;return c||ui.vpf===n?'<option value="'+esc(n)+'">'+esc(n)+' ('+c+')</option>':''}).join('');fP.value=ui.vpf;
  const q=ui.q.trim().toLowerCase();
  const base=all.filter(x=>(ui.filter==='all'||(x.types||[]).includes(ui.filter))&&(ui.vpf==='all'||(x.plats||[]).includes(ui.vpf))&&(!q||x.text.toLowerCase().includes(q))).sort((a,b)=>(b.created||0)-(a.created||0));
  $('vv-list').setAttribute('aria-pressed',ui.vview==='list');$('vv-board').setAttribute('aria-pressed',ui.vview==='board');
  {const fS=$('fStage');fS.hidden=ui.vview==='board';fS.innerHTML='<option value="all">'+(narrow()?'Status':'All stages ('+base.length+')')+'</option>'+STAGES.map(([n])=>'<option value="'+n+'">'+n+(narrow()?'':' ('+base.filter(x=>stageOf(x)===n).length+')')+'</option>').join('');fS.value=ui.stage;fS.classList.toggle('on',ui.stage!=='all')}
  $('fType').classList.toggle('on',ui.filter!=='all');$('fPlat').classList.toggle('on',ui.vpf!=='all');
  $('fClear').hidden=!(ui.filter!=='all'||ui.vpf!=='all'||(ui.stage!=='all'&&ui.vview==='list')||ui.q.trim());
  const list=base.filter(x=>ui.stage==='all'||stageOf(x)===ui.stage);
  $('vList').hidden=ui.vview==='board';$('vBoard').hidden=ui.vview!=='board';
  if(ui.vview==='board')renderBoard(base);
  const L=$('vList');L.innerHTML='';
  if(!list.length)L.innerHTML='<div class="empty">'+(all.length?(ui.stage!=='all'?'No ideas at '+ui.stage+' right now.':'No ideas match that search.'):'Your vault is empty. Add your first idea above.')+'</div>';
  const dayOpts=[...Array(14)].map((_,i)=>addDays(t,i)).map(d=>'<option value="'+iso(d)+'">'+(iso(d)===iso(t)?'Today':d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}))+'</option>').join('');
  list.forEach(it=>{const r=document.createElement('div');r.className='vrow';r.tabIndex=0;r.setAttribute('role','button');r.setAttribute('aria-label','Edit '+it.text);
    const added=it.created?new Date(it.created).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'';
    r.innerHTML='<div><b>'+esc(it.text)+'</b>'+(it.desc?'<span class="desc">'+esc(it.desc)+'</span>':'')+'<div class="meta">'+(it.types||[]).map(ttag).join('')+(it.plats||[]).map(badge).join('')+'</div></div><div class="stcell">'+stSelect(stageOf(it),'st-'+it.id)+'</div>'+
      '<div class="end"><button class="link" data-edit>Edit</button></div>';
    const stop=e=>e.stopPropagation();r.querySelector('.end').addEventListener('click',stop);r.querySelector('.end').addEventListener('keydown',stop);
    const ss=r.querySelector('.stsel');r.querySelector('.stcell').addEventListener('click',stop);ss.addEventListener('keydown',stop);ss.onchange=e=>{it.status=e.target.value;commit();toast(it.text.slice(0,28)+(it.text.length>28?'…':'')+' → '+e.target.value)};
    const open=()=>openIdea(it);
    r.onclick=open;r.onkeydown=e=>{if(e.target===r&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open()}};
    r.querySelector('[data-edit]').onclick=open;
    L.appendChild(r)});
  const isNew=ui.editing==='new',ed=isNew?{}:state.ideas.find(x=>x.id===ui.editing);$('editModal').hidden=!ed;
  if(ed){const D=ui.draft||{text:'',desc:''};
    const multi=isNew&&ui.multi;$('editTitle').textContent=isNew?(multi?'New ideas':'New idea'):'Edit idea';$('editSave').textContent=isNew?'Add':'Save';
    $('editDel').hidden=isNew;$('editSchedWrap').hidden=isNew;$('editMultiBtn').hidden=!isNew;$('editMultiBtn').textContent=multi?'Add one':'Add several';
    $('editOneWrap').hidden=multi;$('editDescWrap').hidden=multi;$('editMultiWrap').hidden=!multi;
    if(document.activeElement!==$('editText'))$('editText').value=D.text;if(document.activeElement!==$('editDesc'))$('editDesc').value=D.desc;
    if(document.activeElement!==$('editDate')&&!$('editDate').value)$('editDate').value=iso(today());
    {const es=$('editStatus');if(!es.options.length)es.innerHTML=STAGES.map(([n])=>'<option>'+n+'</option>').join('');if(document.activeElement!==es)es.value=ui.editStatus||(isNew?'Idea':stageOf(ed))}
    const et=$('editTypes');et.innerHTML='';TG('types').forEach(({n})=>et.appendChild(chip('types',n,ui.editTypes.includes(n),null,()=>{ui.editTypes=toggle(ui.editTypes,n);renderVault()},'e-'+slug(n))));
    const ep=$('editPlats');ep.innerHTML='';TG('plats').forEach(({n})=>ep.appendChild(chip('plats',n,ui.editPlats.includes(n),null,()=>{ui.editPlats=toggle(ui.editPlats,n);renderVault()},'ep-'+slug(n))))}
}

// tag manager
function eachTagged(fn){state.ideas.forEach(fn);Object.values(state.plan).forEach(a=>a.forEach(fn))}
function usage(kind,n){let c=0;eachTagged(x=>{if((x[kind]||[]).includes(n))c++});return c}
function renameTag(kind,oldN,newN){eachTagged(x=>{if(x[kind])x[kind]=x[kind].map(v=>v===oldN?newN:v)});
  const k=kind==='types'?'editTypes':'editPlats';ui[k]=(ui[k]||[]).map(v=>v===oldN?newN:v)}
function deleteTag(kind,n){state.tags[kind]=state.tags[kind].filter(x=>x.n!==n);eachTagged(x=>{if(x[kind])x[kind]=x[kind].filter(v=>v!==n)})}
function renderTags(){$('tagModal').hidden=!ui.tags;if(!ui.tags)return;const kind=ui.tagKind;
  const tb=$('tagTabs');tb.innerHTML='';[['types','Type tags'],['plats','Platform tags']].forEach(([k,l])=>{const b=document.createElement('button');b.id='tt-'+k;b.setAttribute('aria-pressed',kind===k);b.innerHTML=l+'<span class="count">'+TG(k).length+'</span>';b.onclick=()=>{ui.tagKind=k;ui.tagSure=null;renderTags()};tb.appendChild(b)});
  const L=$('tagList');L.innerHTML='';
  if(!TG(kind).length)L.innerHTML='<div class="empty">No tags yet. Add one below.</div>';
  TG(kind).forEach((tg,i)=>{const r=document.createElement('div');r.className='tagrow';const u=usage(kind,tg.n);
    r.innerHTML='<input type="color" id="tc-'+kind+i+'" value="'+esc(tg.c)+'" aria-label="Color for '+esc(tg.n)+'"><input class="inp" id="tn-'+kind+i+'" value="'+esc(tg.n)+'" aria-label="Tag name"><span class="n">'+u+' used</span><button class="link danger" data-del>'+(ui.tagSure===kind+tg.n?'Tap again':'Delete')+'</button>';
    r.querySelector('[type=color]').addEventListener('input',e=>{tg.c=e.target.value;save();render()});
    r.querySelector('.inp').addEventListener('change',e=>{const v=e.target.value.trim();if(!v||v===tg.n){e.target.value=tg.n;return}
      if(TG(kind).some(x=>x!==tg&&x.n.toLowerCase()===v.toLowerCase())){toast('A tag called '+v+' already exists');e.target.value=tg.n;return}
      const old=tg.n;tg.n=v;renameTag(kind,old,v);commit();toast('Renamed to '+v)});
    r.querySelector('[data-del]').onclick=()=>{if(ui.tagSure===kind+tg.n){deleteTag(kind,tg.n);ui.tagSure=null;commit();toast('Tag deleted')}else{ui.tagSure=kind+tg.n;renderTags()}};
    L.appendChild(r)});
  $('tagNewName').placeholder=kind==='types'?'New type, e.g. Podcast':'New platform, e.g. Rumble';
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
      const open=()=>openIdea(it);
      k.onclick=open;k.onkeydown=e=>{if(e.target===k&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open()}};
      k.addEventListener('dragstart',e=>{ui.drag=it.id;k.classList.add('dragging');try{e.dataTransfer.setData('text/plain',it.id);e.dataTransfer.effectAllowed='move'}catch(_){}});
      k.addEventListener('dragend',()=>{ui.drag=null;k.classList.remove('dragging');B.querySelectorAll('.vcol.over').forEach(x=>x.classList.remove('over'))});
      c.appendChild(k)});
    c.addEventListener('dragover',e=>{if(!ui.drag)return;e.preventDefault();c.classList.add('over')});
    c.addEventListener('dragleave',e=>{if(!c.contains(e.relatedTarget))c.classList.remove('over')});
    c.addEventListener('drop',e=>{e.preventDefault();c.classList.remove('over');const it=state.ideas.find(x=>x.id===ui.drag);ui.drag=null;if(it&&stageOf(it)!==n){it.status=n;commit();toast('Moved to '+n)}});
    B.appendChild(c)});
  // Scheduled + Published come from the planner
  const planned=[];Object.keys(state.plan).sort().forEach(k=>state.plan[k].forEach(x=>planned.push([k,x])));
  const lim=iso(addDays(t,-30));
  const q=ui.q.trim().toLowerCase(),okF=x=>(ui.filter==='all'||(x.types||[]).includes(ui.filter))&&(ui.vpf==='all'||(x.plats||[]).includes(ui.vpf))&&(!q||x.text.toLowerCase().includes(q));
  [['Scheduled',planned.filter(([k,x])=>!x.done&&okF(x))],['Published',planned.filter(([k,x])=>x.done&&k>=lim&&okF(x)).reverse()]].forEach(([n,arr])=>{
    const c=col(n,arr.length,true);
    arr.slice(0,40).forEach(([k,x])=>{const b=document.createElement('button');b.className='vcard'+(n==='Published'?' pub':'');b.style.cursor='pointer';
      b.innerHTML='<span class="when">'+parse(k).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})+(x.time?' · '+fmtTime(x.time):'')+'</span><b>'+esc(x.text)+'</b><span class="tg">'+(x.types||[]).map(ttag).join('')+(x.plats||[]).map(badge).join('')+'</span>';
      b.onclick=()=>gotoPlan(k,x.mode);c.appendChild(b)});
    B.appendChild(c)});
}
function openIdea(it){$('editDel').dataset.sure='';$('editDel').textContent='Delete';$('editDate').value='';$('editMulti').value='';ui.multi=false;
  if(it){ui.editing=it.id;ui.editStatus=stageOf(it);ui.editTypes=(it.types||[]).slice();ui.editPlats=(it.plats||[]).slice();ui.draft={text:it.text,desc:it.desc||''}}
  else{ui.editing='new';ui.editStatus='Idea';ui.editTypes=[];ui.editPlats=[];ui.draft={text:'',desc:''}}
  ui.tab='vault';render();setTimeout(()=>$('editText').focus(),0)}
$('editMultiBtn').onclick=()=>{ui.multi=!ui.multi;renderVault();setTimeout(()=>$(ui.multi?'editMulti':'editText').focus(),0)};
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

// ===== Statistics =====
const STREAM_PLATS=['Kick','Twitch','YouTube'];
const folLabel=p=>p==='YouTube'?'Subscribers':'Followers';
const fmtN=n=>{n=+n||0;const a=Math.abs(n);return a>=1e6?(n/1e6).toFixed(a>=1e7?0:1).replace(/\.0$/,'')+'M':a>=1e4?Math.round(n/1e3)+'K':a>=1e3?(n/1e3).toFixed(1).replace(/\.0$/,'')+'K':String(Math.round(n))};
const fmtP=n=>(n>0?'+':'')+(Math.abs(n)>=10?Math.round(n):n.toFixed(1))+'%';
function sampleAnalytics(t){let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
  const daily=[],content=[],N=120,P={Kick:{f:380,g:1.8,v:0,live:[2,3,5,6]},YouTube:{f:1100,g:2.6,v:250},TikTok:{f:2200,g:13,v:800}};
  for(let i=0;i<N;i++){const d=addDays(t,-(N-1)+i),k=iso(d),prog=i/N;
    Object.entries(P).forEach(([p,c])=>{c.f+=c.g*(.5+rnd())*(1+prog*.6);const row={date:k,plat:p,followers:Math.round(c.f),views:0};
      if(p==='Kick'){if(c.live.includes(d.getDay())){row.viewers=Math.round((12+prog*13)*(.85+rnd()*.3));row.peak=Math.round(row.viewers*(1.6+rnd()*.5));row.hours=+(3+rnd()*1.5).toFixed(1);row.views=Math.round(row.viewers*(14+rnd()*8));c.f+=2+rnd()*4}else row.views=Math.round(20+rnd()*30)}
      else if(p==='YouTube')row.views=Math.round((c.v+prog*280)*(.7+rnd()*.6)*(d.getDay()===5||d.getDay()===6?1.5:1));
      else row.views=Math.round((c.v+prog*1700)*(.5+rnd()*1.1)*(rnd()>.93?3:1));
      daily.push(row)})}
  const C=[['Cop chase goes wrong in 10 seconds','TikTok','Clip',58000,4100,210],['First night as a new gang','YouTube','Long-form',3100,240,61],['Viewers vote the next heist','Kick','Live',1400,0,380],['Community car meet highlights','TikTok','Short',22000,1500,88],['Hospital MLO timelapse','YouTube','Short',9400,610,44],['Heist night: full stream','Kick','Live',1100,0,290],['3 clips from heist night','TikTok','Clip',14000,820,51],['Weekly recap','YouTube','Long-form',1900,150,32],['Funniest chat moments','TikTok','Clip',31000,2600,140],['Sponsor read: energy drink','TikTok','Short',6800,300,19],['Build stream: hospital MLO','Kick','Live',900,0,190],['Server tour for new players','YouTube','Long-form',4200,310,77],['Raid gone wrong','TikTok','Clip',11000,700,40],['Q&A: how I run Digital Life','YouTube','Long-form',2600,230,95]];
  C.forEach((c,i)=>content.push({id:uid(),title:c[0],plat:c[1],type:c[2],date:iso(addDays(t,-Math.round(2+i*6.5))),views:c[3],likes:c[4],comments:c[5]}));
  return {daily,content,example:true}}
const AN=()=>state.analytics;
function anRange(){const t=today();let a,b=t;if(ui.anR==='cycle'){a=parse(state.start);if(a>t)a=t}else a=addDays(t,-(+ui.anR-1));const n=Math.round((b-a)/DAY)+1;return {a,b,n,pa:addDays(a,-n),pb:addDays(a,-1)}}
function anPlats(){const order=TG('plats').map(x=>x.n),have=[...new Set(AN().daily.map(r=>r.plat).concat(AN().content.map(r=>r.plat)))];return have.sort((x,y)=>(order.indexOf(x)+99)%999-(order.indexOf(y)+99)%999)}
const inR=(k,a,b)=>k>=iso(a)&&k<=iso(b);
function folAt(p,k){let v=null,best='';AN().daily.forEach(r=>{if(r.plat===p&&r.followers!=null&&r.date<=k&&r.date>=best){best=r.date;v=r.followers}});return v}
function rowsIn(a,b,p){return AN().daily.filter(r=>inR(r.date,a,b)&&(p==='all'||r.plat===p))}
function contIn(a,b,p){return AN().content.filter(r=>inR(r.date,a,b)&&(p==='all'||r.plat===p))}
const sum=(arr,f)=>arr.reduce((s,x)=>s+(+x[f]||0),0);
function niceTicks(lo,hi,n){if(hi===lo){hi=lo+1}const raw=(hi-lo)/n,mag=Math.pow(10,Math.floor(Math.log10(raw))),st=[1,2,5,10].map(x=>x*mag).find(x=>x>=raw)||raw;const a=Math.floor(lo/st)*st,b=Math.ceil(hi/st)*st,out=[];for(let v=a;v<=b+st/2;v+=st)out.push(+v.toFixed(6));return out}
const tipEl=()=>$('tip');
function showTip(html,x,y){const t=tipEl();t.innerHTML=html;t.hidden=false;const r=t.getBoundingClientRect();let L=x+14,T=y+14;if(L+r.width>innerWidth-8)L=x-r.width-14;if(T+r.height>innerHeight-8)T=y-r.height-14;t.style.left=Math.max(8,L)+'px';t.style.top=Math.max(8,T)+'px'}
function hideTip(){tipEl().hidden=true}
const dShort=k=>parse(k).toLocaleDateString(undefined,{month:'short',day:'numeric'});
function lineChart(el,{dates,series,yFmt,H=230,dots=false,area=false}){
  const W=Math.max(300,Math.round(el.clientWidth||640)),pl=46,pr=series.length>1||!dots?92:24,pt=14,pb=26,iw=W-pl-pr,ih=H-pt-pb,n=dates.length;
  const ys=[];series.forEach(s=>s.vals.forEach(v=>{if(v!=null)ys.push(v)}));if(!ys.length){el.innerHTML='<p class="none">No data</p>';return}
  let lo=Math.min(...ys),hi=Math.max(...ys);if(lo>0&&!dots)lo=Math.min(lo,0);if(lo===hi){hi+=1}const tk=niceTicks(lo,hi,4);lo=tk[0];hi=tk.at(-1);
  const X=i=>pl+(n<2?iw/2:i/(n-1)*iw),Y=v=>pt+ih-(v-lo)/(hi-lo)*ih;
  let g='';tk.forEach(v=>{g+='<line class="gl" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/><text x="'+(pl-8)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+yFmt(v)+'</text>'});
  const xt=Math.max(2,Math.min(6,n,Math.floor(iw/78)));for(let j=0;j<xt;j++){const i=Math.round(j*(n-1)/Math.max(1,xt-1));g+='<text x="'+X(i)+'" y="'+(H-6)+'" text-anchor="'+(j===0?'start':j===xt-1?'end':'middle')+'">'+dShort(dates[i])+'</text>'}
  g+='<line class="ax" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(lo)+'" y2="'+Y(lo)+'"/>';
  const ends=[];
  series.forEach(s=>{let d='',pen=false,last=null;s.vals.forEach((v,i)=>{if(v==null){pen=false;return}d+=(pen?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1);pen=true;last=i});
    if(area&&d){const f=s.vals.findIndex(v=>v!=null);g+='<path d="'+d+'L'+X(last)+' '+Y(lo)+'L'+X(f)+' '+Y(lo)+'Z" fill="'+s.color+'" opacity=".12"/>'}
    g+='<path d="'+d+'" fill="none" stroke="'+s.color+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    if(dots)s.vals.forEach((v,i)=>{if(v!=null)g+='<circle cx="'+X(i)+'" cy="'+Y(v)+'" r="4" fill="'+s.color+'" stroke="#1d1c19" stroke-width="2"/>'});
    if(last!=null){g+='<circle cx="'+X(last)+'" cy="'+Y(s.vals[last])+'" r="4.5" fill="'+s.color+'" stroke="#1d1c19" stroke-width="2"/>';ends.push({y:Y(s.vals[last]),name:s.name,v:s.vals[last],x:X(last)})}});
  if(pr>40){ends.sort((a,b)=>a.y-b.y);for(let i=1;i<ends.length;i++)if(ends[i].y-ends[i-1].y<28)ends[i].y=ends[i-1].y+28;
    ends.forEach(e=>{g+='<text class="elbl" x="'+(W-pr+10)+'" y="'+(e.y)+'">'+esc(e.name)+'</text><text class="elbl2" x="'+(W-pr+10)+'" y="'+(e.y+14)+'">'+yFmt(e.v)+'</text>'})}
  g+='<line class="xh" id="'+el.id+'-xh" x1="0" x2="0" y1="'+pt+'" y2="'+(pt+ih)+'" visibility="hidden"/><rect x="'+pl+'" y="'+pt+'" width="'+iw+'" height="'+ih+'" fill="transparent" class="hit"/>';
  el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(series.map(s=>s.name).join(', '))+' over time">'+g+'</svg>';
  const svg=el.querySelector('svg'),hit=svg.querySelector('.hit'),xh=svg.querySelector('.xh');
  const mv=e=>{const p=e.touches?e.touches[0]:e,r=svg.getBoundingClientRect(),sx=(p.clientX-r.left)*W/r.width,i=Math.max(0,Math.min(n-1,Math.round((sx-pl)/iw*(n-1))));
    xh.setAttribute('x1',X(i));xh.setAttribute('x2',X(i));xh.setAttribute('visibility','visible');
    const rows=series.map(s=>s.vals[i]==null?'':'<div class="tr2"><span><i style="--c:'+s.color+'"></i>'+esc(s.name)+'</span><b>'+(s.tipFmt||yFmt)(s.vals[i],i)+'</b></div>').join('');
    showTip('<div class="th">'+parse(dates[i]).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})+'</div>'+(rows||'<span class="sub">No data</span>'),p.clientX,p.clientY)};
  const out=()=>{xh.setAttribute('visibility','hidden');hideTip()};
  hit.addEventListener('mousemove',mv);hit.addEventListener('mouseleave',out);hit.addEventListener('touchstart',mv,{passive:true});hit.addEventListener('touchmove',mv,{passive:true});hit.addEventListener('touchend',out)}
function barChart(el,{labels,vals,color,yFmt,tips,H=170,xEvery}){
  const W=Math.max(300,Math.round(el.clientWidth||600)),pl=46,pr=8,pt=10,pb=24,iw=W-pl-pr,ih=H-pt-pb,n=vals.length;
  const hi0=Math.max(1,...vals),tk=niceTicks(0,hi0,3),hi=tk.at(-1),slot=iw/n,bw=Math.max(2,Math.min(28,slot*.68)),Y=v=>pt+ih-v/hi*ih;
  let g='';tk.forEach(v=>{g+='<line class="gl" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/><text x="'+(pl-8)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+yFmt(v)+'</text>'});
  const ev=xEvery||Math.ceil(n/7);
  vals.forEach((v,i)=>{const x=pl+i*slot+(slot-bw)/2,h=Math.max(0,ih-(Y(v)-pt)),y=pt+ih-h,r=Math.min(4,bw/2,h);
    if(h>0)g+='<path d="M'+x+' '+(pt+ih)+'V'+(y+r)+'Q'+x+' '+y+' '+(x+r)+' '+y+'H'+(x+bw-r)+'Q'+(x+bw)+' '+y+' '+(x+bw)+' '+(y+r)+'V'+(pt+ih)+'Z" fill="'+(Array.isArray(color)?color[i]:color)+'"/>';
    g+='<rect class="bh" data-i="'+i+'" x="'+(pl+i*slot)+'" y="'+pt+'" width="'+slot+'" height="'+ih+'" fill="transparent"/>';
    if(i%ev===0||i===n-1&&n<=12)g+='<text x="'+(pl+i*slot+slot/2)+'" y="'+(H-6)+'" text-anchor="middle">'+esc(labels[i])+'</text>'});
  g+='<line class="ax" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+(pt+ih)+'" y2="'+(pt+ih)+'"/>';
  el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Bar chart">'+g+'</svg>';
  el.querySelectorAll('.bh').forEach(b=>{const i=+b.dataset.i,f=e=>{const p=e.touches?e.touches[0]:e;showTip(tips[i],p.clientX,p.clientY)};b.addEventListener('mousemove',f);b.addEventListener('mouseleave',hideTip);b.addEventListener('touchstart',f,{passive:true});b.addEventListener('touchend',hideTip)})}
function spark(vals,color){vals=vals.filter(x=>x!=null);const v=vals;if(v.length<2)return '';const lo=Math.min(...v),hi=Math.max(...v),W=120,H=28,X=i=>i/(vals.length-1)*W,Y=x=>H-2-(x-lo)/((hi-lo)||1)*(H-4);
  let d='',pen=false;vals.forEach((x,i)=>{if(x==null){pen=false;return}d+=(pen?'L':'M')+X(i).toFixed(1)+' '+Y(x).toFixed(1);pen=true});return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true"><path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>'}
function renderStats(){
  const A=AN(),has=A.daily.length||A.content.length;
  $('anEmpty').hidden=!!has;$('anBody').hidden=!has;
  document.querySelectorAll('#anRange button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.r===String(ui.anR)));
  const plats=anPlats();if(ui.anP!=='all'&&!plats.includes(ui.anP))ui.anP='all';
  $('anPlat').innerHTML='<option value="all">All platforms</option>'+plats.map(p=>'<option>'+esc(p)+'</option>').join('');$('anPlat').value=ui.anP;$('anPlat').classList.toggle('on',ui.anP!=='all');
  if(!has)return;
  const {a,b,n,pa,pb}=anRange(),P=ui.anP,sel=P==='all'?plats:[P],dates=[...Array(n)].map((_,i)=>iso(addDays(a,i)));
  // KPIs
  const folNow=sel.reduce((s,p)=>s+(folAt(p,iso(b))||0),0),folStart=sel.reduce((s,p)=>s+(folAt(p,iso(addDays(a,-1)))??folAt(p,iso(a))??0),0);
  const R=rowsIn(a,b,P),PR=rowsIn(pa,pb,P),vw=sum(R,'views'),pvw=sum(PR,'views');
  const live=R.filter(r=>r.hours>0),plive=PR.filter(r=>r.hours>0),av=live.length?sum(live,'viewers')/live.length:0,pav=plive.length?sum(plive,'viewers')/plive.length:0;
  const C=contIn(a,b,P),PC=contIn(pa,pb,P),eng=x=>{const v=sum(x,'views');return v?(sum(x,'likes')+sum(x,'comments'))/v*100:0},en=eng(C),pen=eng(PC);
  const dl=(now,prev,pct)=>{if(!prev)return '<span class="dl">—</span>';const c=pct?now-prev:(now-prev)/prev*100;return '<span class="dl'+(c>0?' up':'')+'">'+(c>0?'▲ ':c<0?'▼ ':'')+(pct?(c>0?'+':'')+c.toFixed(1)+' pts':fmtP(c))+'</span>'};
  const folSeries=dates.map(k=>sel.reduce((s,p)=>s+(folAt(p,k)||0),0)),vwSeries=dates.map(k=>sum(R.filter(r=>r.date===k),'views'));
  $('anKpis').innerHTML=
    '<div class="kpi"><span class="sk">'+(P!=='all'?folLabel(P):'Followers')+'</span><b>'+fmtN(folNow)+'</b><span class="dl'+(folNow>folStart?' up':'')+'">'+(folNow-folStart>=0?'▲ +':'▼ ')+fmtN(folNow-folStart)+'</span>'+spark(folSeries,'var(--munsell-hi)')+'</div>'+
    '<div class="kpi"><span class="sk">Views</span><b>'+fmtN(vw)+'</b>'+dl(vw,pvw)+spark(vwSeries,'var(--munsell-hi)')+'</div>'+
    '<div class="kpi"><span class="sk">Avg live viewers</span><b>'+(live.length?Math.round(av):'—')+'</b>'+(live.length?dl(av,pav):'<span class="dl">—</span>')+spark(dates.map(k=>{const r=live.filter(x=>x.date===k);return r.length?sum(r,'viewers')/r.length:null}),'var(--munsell-hi)')+'</div>'+
    '<div class="kpi"><span class="sk">Engagement</span><b>'+(C.length?en.toFixed(1)+'%':'—')+'</b>'+(C.length?dl(en,PC.length?pen:0,true):'<span class="dl">—</span>')+'</div>';
  // follower growth
  $('fgPct').setAttribute('aria-pressed',ui.fg==='pct');$('fgAbs').setAttribute('aria-pressed',ui.fg==='abs');
  const fs=sel.filter(p=>A.daily.some(r=>r.plat===p&&r.followers!=null)).map(p=>{const base=folAt(p,iso(addDays(a,-1)))??dates.map(k=>folAt(p,k)).find(v=>v!=null);const raw=dates.map(k=>folAt(p,k));
    return {name:p,color:tcol('plats',p),raw,vals:ui.fg==='pct'?raw.map(v=>v==null||!base?null:(v-base)/base*100):raw,tipFmt:(v,i)=>fmtN(raw[i])+(ui.fg==='pct'?' ('+fmtP(v)+')':'')}});
  lineChart($('chFollow'),{dates,series:fs,yFmt:ui.fg==='pct'?(v=>(Math.round(v*10)/10)+'%'):fmtN});
  $('lgFollow').innerHTML=fs.length>1?fs.map(s=>'<span><i style="--c:'+s.color+'"></i>'+esc(s.name)+'</span>').join(''):'';
  // views per day (weekly when long)
  const wk=n>45,buckets=[];if(wk){for(let i=0;i<n;i+=7){const ks=dates.slice(i,i+7);buckets.push({lbl:dShort(ks[0]),ks})}}else dates.forEach(k=>buckets.push({lbl:dShort(k),ks:[k]}));
  barChart($('chViews'),{labels:buckets.map(x=>wk?x.lbl:parse(x.ks[0]).getDate()+''),vals:buckets.map(x=>sum(R.filter(r=>x.ks.includes(r.date)),'views')),color:P==='all'?'var(--munsell-hi)':tcol('plats',P),yFmt:fmtN,
    tips:buckets.map(x=>{const v=sum(R.filter(r=>x.ks.includes(r.date)),'views');return '<div class="th">'+(wk?'Week of '+dShort(x.ks[0]):parse(x.ks[0]).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}))+'</div><div class="tr2"><span>Views</span><b>'+v.toLocaleString()+'</b></div>'}),xEvery:wk?2:Math.ceil(buckets.length/8)});
  // share
  const all=rowsIn(a,b,'all'),tot=sum(all,'views')||1;
  $('chShare').innerHTML=plats.map(p=>({p,v:sum(all.filter(r=>r.plat===p),'views')})).sort((x,y)=>y.v-x.v).map(o=>'<div class="hb2"><span class="nm">'+badge(o.p)+esc(o.p)+'</span><span class="tr"><i style="width:'+(o.v/tot*100)+'%;--c:'+tcol('plats',o.p)+(P!=='all'&&P!==o.p?';opacity:.35':'')+'"></i></span><em>'+fmtN(o.v)+' · '+Math.round(o.v/tot*100)+'%</em></div>').join('');
  // live
  const LR=rowsIn(a,b,P).filter(r=>r.hours>0);$('liveCard').hidden=!LR.length&&!A.daily.some(r=>r.hours>0);
  const lp=[...new Set(LR.map(r=>r.plat))];
  $('liveStats').innerHTML='<div><b>'+LR.length+'</b><span>Streams</span></div><div><b>'+(Math.round(sum(LR,'hours')*10)/10)+'</b><span>Hours live</span></div><div><b>'+(LR.length?Math.max(...LR.map(r=>r.peak||r.viewers||0)):'—')+'</b><span>Peak viewers</span></div>';
  if(LR.length){const ld=[...new Set(LR.map(r=>r.date))].sort();lineChart($('chLive'),{dates:ld,dots:true,H:200,series:lp.map(p=>({name:p,color:tcol('plats',p),vals:ld.map(k=>{const r=LR.find(x=>x.date===k&&x.plat===p);return r?r.viewers:null}),tipFmt:(v,i)=>{const r=LR.find(x=>x.date===ld[i]&&x.plat===p);return v+' avg · '+(r.peak||'?')+' peak · '+r.hours+'h'}})),yFmt:fmtN})}
  else $('chLive').innerHTML='<p class="none">No streams</p>';
  // top content
  const sk=ui.anSort||'views',val=x=>sk==='eng'?(x.views?(x.likes+x.comments)/x.views:0):sk==='date'?x.date:+x[sk]||0;
  const rows=C.slice().sort((x,y)=>val(y)>val(x)?1:val(y)<val(x)?-1:0).slice(0,10);
  const th=(k,l,num)=>'<th class="'+(num?'num ':'')+(sk===k?'on':'')+'" data-s="'+k+'">'+l+(sk===k?' ↓':'')+'</th>';
  if(narrow()){$('topTbl').innerHTML='<thead><tr><th>Post</th>'+th('views','Views',1)+th('eng','Eng.',1)+'</tr></thead><tbody>'+(rows.length?rows.map(x=>'<tr><td><span class="tt">'+badge(x.plat)+'<span title="'+esc(x.title)+'">'+esc(x.title)+'</span></span><span class="tsub">'+dShort(x.date)+' · '+fmtN(x.likes)+' likes · '+fmtN(x.comments)+' comments</span></td><td class="num">'+fmtN(x.views)+'</td><td class="num">'+(x.views?((x.likes+x.comments)/x.views*100).toFixed(1)+'%':'—')+'</td></tr>').join(''):'<tr><td colspan="3" class="dim" style="text-align:center;padding:20px">No results</td></tr>')+'</tbody>';$('topTbl').classList.add('cmp')}
  else{$('topTbl').classList.remove('cmp');
  $('topTbl').innerHTML='<thead><tr><th>Post</th>'+th('date','Date')+th('views','Views',1)+th('likes','Likes',1)+th('comments','Comments',1)+th('eng','Engagement',1)+'<th></th></tr></thead><tbody>'+
    (rows.length?rows.map(x=>'<tr><td><span class="tt">'+badge(x.plat)+'<span title="'+esc(x.title)+'">'+esc(x.title)+'</span></span></td><td class="dim">'+dShort(x.date)+'</td><td class="num">'+fmtN(x.views)+'</td><td class="num">'+fmtN(x.likes)+'</td><td class="num">'+fmtN(x.comments)+'</td><td class="num">'+(x.views?((x.likes+x.comments)/x.views*100).toFixed(1)+'%':'—')+'</td><td><button class="x" data-del="'+x.id+'" aria-label="Remove result">✕</button></td></tr>').join(''):'<tr><td colspan="7" class="dim" style="text-align:center;padding:20px">No results</td></tr>')+'</tbody>'}
  $('topTbl').querySelectorAll('th[data-s]').forEach(h=>h.onclick=()=>{ui.anSort=h.dataset.s;renderStats()});
  $('topTbl').querySelectorAll('[data-del]').forEach(x=>x.onclick=()=>{A.content=A.content.filter(c=>c.id!==x.dataset.del);commit();toast('Post result removed')});
  // consistency vs growth (weekly)
  const wks=[];for(let i=0;i<n;i+=7)wks.push(dates.slice(i,i+7));
  const posted=wks.map(ks=>{const titles=new Set();ks.forEach(k=>(state.plan[k]||[]).forEach(x=>{if(x.done&&(P==='all'||(x.plats||[]).includes(P)))titles.add(k+x.text)}));A.content.forEach(c=>{if(ks.includes(c.date)&&(P==='all'||c.plat===P))titles.add(c.date+c.title)});return titles.size});
  const wv=wks.map(ks=>sum(R.filter(r=>ks.includes(r.date)),'views')),lbl=wks.map(ks=>dShort(ks[0]));
  barChart($('chPosts'),{labels:lbl,vals:posted,color:'var(--gold)',yFmt:v=>Math.round(v)+'',H:110,xEvery:Math.ceil(wks.length/7),tips:wks.map((ks,i)=>'<div class="th">Week of '+dShort(ks[0])+'</div><div class="tr2"><span>Posts</span><b>'+posted[i]+'</b></div>')});
  barChart($('chWkViews'),{labels:lbl,vals:wv,color:'var(--munsell-hi)',yFmt:fmtN,H:110,xEvery:Math.ceil(wks.length/7),tips:wks.map((ks,i)=>'<div class="th">Week of '+dShort(ks[0])+'</div><div class="tr2"><span>Views</span><b>'+wv[i].toLocaleString()+'</b></div>')});
  const cs=cycleStats();let pl=0,pd=0;Object.keys(state.plan).forEach(k=>{if(inR(k,a,b)&&k<=iso(today()))state.plan[k].forEach(x=>{pl++;if(x.done)pd++})});
  $('conStats').innerHTML='<div><b>'+cs.days+'</b><span>Days</span></div><div><b>'+cs.best+'</b><span>Best streak</span></div><div><b>'+(pl?Math.round(pd/pl*100)+'%':'—')+'</b><span>Follow-through</span></div>';
}
// data entry
function anModal(kind){ui.anm=kind;const B=$('anmBody'),t=iso(today()),pl=TG('plats').map(x=>'<option>'+esc(x.n)+'</option>').join('');$('anModal').hidden=false;
  if(kind==='log'){$('anmTitle').textContent='Log stats';$('anmSave').textContent='Save';
    B.innerHTML='<div class="anform"><label class="field"><span>Date</span><input class="inp" type="date" id="lgDate" value="'+t+'"></label><label class="field"><span>Platform</span><select class="inp" id="lgPlat">'+pl+'</select></label><label class="field"><span id="lgFolL">Followers</span><input class="inp" type="number" min="0" id="lgFol"></label><label class="field"><span>Views</span><input class="inp" type="number" min="0" id="lgViews"></label><label class="field"><span>Avg viewers</span><input class="inp" type="number" min="0" id="lgAvg"></label><label class="field"><span>Peak viewers</span><input class="inp" type="number" min="0" id="lgPeak"></label><label class="field"><span>Hours streamed</span><input class="inp" type="number" min="0" step="0.1" id="lgHours"></label></div>';
    if(ui.anP!=='all')$('lgPlat').value=ui.anP;const sync=()=>{$('lgFolL').textContent=folLabel($('lgPlat').value)};$('lgPlat').onchange=sync;sync()}
  else if(kind==='post'){$('anmTitle').textContent='Add post result';$('anmSave').textContent='Add';
    const done=[];Object.keys(state.plan).sort().reverse().forEach(k=>state.plan[k].forEach(x=>{if(x.done)done.push({k,x})}));
    B.innerHTML='<div class="anform">'+(done.length?'<label class="field full"><span>From your planner</span><select class="inp" id="poFrom"><option value="">Type it in</option>'+done.slice(0,40).map((d,i)=>'<option value="'+i+'">'+esc(d.x.text)+' · '+dShort(d.k)+'</option>').join('')+'</select></label>':'')+'<label class="field full"><span>Title</span><input class="inp" id="poTitle" autocomplete="off"></label><label class="field"><span>Platform</span><select class="inp" id="poPlat">'+pl+'</select></label><label class="field"><span>Date posted</span><input class="inp" type="date" id="poDate" value="'+t+'"></label><label class="field"><span>Views</span><input class="inp" type="number" min="0" id="poViews"></label><label class="field"><span>Likes</span><input class="inp" type="number" min="0" id="poLikes"></label><label class="field"><span>Comments</span><input class="inp" type="number" min="0" id="poCom"></label></div>';
    const f=$('poFrom');if(f)f.onchange=()=>{const d=done[+f.value];if(!d)return;$('poTitle').value=d.x.text;$('poDate').value=d.k;if((d.x.plats||[])[0])$('poPlat').value=d.x.plats[0]}}
  else{$('anmTitle').textContent='Data';$('anmSave').textContent='Import';
    B.innerHTML='<div class="anform"><textarea class="inp full" id="anJson" spellcheck="false" placeholder=\'{"daily":[{"date":"2026-11-01","plat":"Kick","followers":590,"views":420,"viewers":23,"peak":41,"hours":3.5}],"content":[{"title":"Heist night","plat":"Kick","date":"2026-11-01","views":1100,"likes":0,"comments":290}]}\'></textarea></div><div class="acts" style="justify-content:space-between;flex-wrap:wrap"><button class="link" id="anCopy" type="button">Copy</button>'+(AN().example?'<button class="link danger" id="anClear" type="button">Clear example data</button>':'<button class="link danger" id="anClear" type="button">Clear all</button>')+'</div>';
    $('anCopy').onclick=()=>{const txt=JSON.stringify({daily:AN().daily,content:AN().content});$('anJson').value=txt;try{navigator.clipboard.writeText(txt).then(()=>toast('Copied'),()=>{$('anJson').select();toast('Select and copy the text')})}catch(e){$('anJson').select()}};
    $('anClear').onclick=()=>{const b=$('anClear');if(!b.dataset.sure){b.dataset.sure=1;b.textContent='Tap again to clear';return}state.analytics={daily:[],content:[],example:false};closeAn();commit();toast('Stats cleared')}}
  setTimeout(()=>{const f=B.querySelector('input:not([type=date]),textarea');if(f)f.focus()},0)}
function closeAn(){$('anModal').hidden=true;ui.anm=null}
function ingest(data){const A=AN();if(A.example){A.daily=[];A.content=[];A.example=false}let nd=0,nc=0;
  (data.daily||[]).forEach(r=>{if(!r||!/^\d{4}-\d\d-\d\d$/.test(r.date)||!r.plat)return;const row={date:r.date,plat:String(r.plat)};['followers','views','viewers','peak','hours'].forEach(f=>{if(r[f]!=null&&r[f]!==''&&!isNaN(+r[f]))row[f]=+r[f]});
    const i=A.daily.findIndex(x=>x.date===row.date&&x.plat===row.plat);if(i>=0)Object.assign(A.daily[i],row);else A.daily.push(row);nd++;
    if(!TG('plats').some(t=>t.n===row.plat))TG('plats').push({n:row.plat,c:'#9a9a9a'})});
  (data.content||[]).forEach(c=>{if(!c||!c.title||!c.plat||!/^\d{4}-\d\d-\d\d$/.test(c.date))return;A.content.push({id:c.id||uid(),title:String(c.title),plat:String(c.plat),type:c.type||'',date:c.date,views:+c.views||0,likes:+c.likes||0,comments:+c.comments||0});nc++});
  A.daily.sort((x,y)=>x.date<y.date?-1:1);commit();return {daily:nd,content:nc}}
function saveAn(){const k=ui.anm;
  if(k==='log'){const v=id=>{const x=$(id).value;return x===''?null:+x},row={date:$('lgDate').value,plat:$('lgPlat').value,followers:v('lgFol'),views:v('lgViews'),viewers:v('lgAvg'),peak:v('lgPeak'),hours:v('lgHours')};
    if(!row.date){toast('Pick a date');return}if([row.followers,row.views,row.viewers].every(x=>x==null)){toast('Add at least one number');return}
    Object.keys(row).forEach(f=>{if(row[f]==null)delete row[f]});ingest({daily:[row]});closeAn();toast('Stats logged for '+row.plat)}
  else if(k==='post'){const t=$('poTitle').value.trim();if(!t){toast('Add a title');$('poTitle').focus();return}
    ingest({content:[{title:t,plat:$('poPlat').value,date:$('poDate').value,views:$('poViews').value,likes:$('poLikes').value,comments:$('poCom').value}]});closeAn();toast('Post result added')}
  else{let d;try{d=JSON.parse($('anJson').value)}catch(e){toast('That isn’t valid JSON. Check the format and try again.');return}const r=ingest(d);closeAn();toast('Imported '+r.daily+' days and '+r.content+' posts')}}
function resetBox(){const b=$('resetBox');b.innerHTML='<button class="link" id="resetBtn">Start over</button>';
  $('resetBtn').onclick=()=>{b.innerHTML='<span class="lbl">Clear everything?</span><button class="btn blue sm" id="resetYes">Yes, start over</button><button class="link" id="resetNo">Cancel</button>';
    $('resetYes').onclick=()=>{state=fresh();state.begun=false;ui.sel=null;ui.month=null;ui.tab='track';renderTrack.once=false;resetBox();commit();$('scroller').scrollTo({top:0,behavior:'smooth'});toast('Cleared. Tap Start Here when you\u2019re ready')};$('resetNo').onclick=resetBox}}

function render(){renderShell();({track:renderTrack,plan:renderPlan,vault:renderVault,stats:renderStats})[ui.tab]();renderTags()}
function commit(){save();render()}

document.querySelectorAll('.bnav button').forEach(b=>b.onclick=()=>{ui.tab=b.dataset.tab;ui.planning=null;ui.editing=null;ui.item=null;render();$('scroller').scrollTo(0,0)});
$('start').onchange=e=>{if(e.target.value){state.start=e.target.value;ui.sel=null;ui.month=null;commit()}};
const go=n=>{ui.sel=clampDay(n);render()};
$('cycNext').onclick=()=>{const cs=cycleStats(),end=iso(addDays(parse(state.start),89));
  state.history.push(Object.assign({n:state.cycle,start:state.start,end,win:$('cycWin').value.trim(),change:$('cycChange').value.trim()},cs));
  state.cycle++;state.start=iso(today());state.days={};state.weeks={};state.months={};state.reviews={};state.grow={};state.setup=RESET_TASKS.map(()=>0);
  $('cycWin').value='';$('cycChange').value='';ui.sel=null;ui.openSetup=true;commit();$('scroller').scrollTo({top:0,behavior:'smooth'});toast('Cycle '+state.cycle+' started. Quick reset first.')};
$('editDaily').onclick=()=>{ui.editTasks=ui.editTasks==='daily'?null:'daily';render()};$('editWeekly').onclick=()=>{ui.editTasks=ui.editTasks==='weekly'?null:'weekly';render()};
$('prevDay').onclick=()=>go(ui.sel-1);$('nextDay').onclick=()=>go(ui.sel+1);$('goToday').onclick=()=>go(dayNum());
$('wPrev').onclick=()=>{ui.weekOff--;ui.pday=null;render()};$('wNext').onclick=()=>{ui.weekOff++;ui.pday=null;render()};$('wToday').onclick=()=>{ui.weekOff=0;ui.pday=null;render()};
$('newItem').onclick=()=>{const t=today(),ws=weekStart(ui.weekOff);openItem(ui.weekOff===0?iso(t):iso(ws),null)};
$('itText').addEventListener('input',e=>{if(ui.item)ui.item.text=e.target.value});
$('itDate').addEventListener('change',e=>{if(ui.item)ui.item.date=e.target.value||ui.item.date});
$('itTime').addEventListener('change',e=>{if(ui.item)ui.item.time=e.target.value});
$('fromVault').onchange=e=>{const D=ui.item,x=state.ideas.find(i=>i.id===e.target.value);D.from=e.target.value;if(x){D.text=x.text;D.types=(x.types||[]).slice();D.plats=(x.plats||[]).slice();$('itText').value=x.text}renderItemModal()};
$('itDone').onclick=()=>{ui.item.done=!ui.item.done;renderItemModal()};
$('itSave').onclick=saveItem;
const closeItem=()=>{ui.item=null;$('itDel').dataset.sure='';render()};
$('itCancel').onclick=closeItem;$('itemModal').addEventListener('click',e=>{if(e.target.id==='itemModal')closeItem()});
$('itDel').onclick=()=>{const b=$('itDel'),D=ui.item;if(b.dataset.sure){state.plan[D.orig]=(state.plan[D.orig]||[]).filter(x=>x.id!==D.id);b.dataset.sure='';ui.item=null;commit();toast('Deleted')}else{b.dataset.sure='1';renderItemModal()}};
$('itBack').onclick=()=>{const D=ui.item,arr=state.plan[D.orig]||[],it=arr.find(x=>x.id===D.id);if(it){state.plan[D.orig]=arr.filter(x=>x!==it);state.ideas.push({id:uid(),text:it.text,types:it.types||[],plats:it.plats||[],status:'Ready To Post',created:Date.now()})}ui.item=null;commit();toast('Moved back to the Idea Vault')};
$('vSearch').addEventListener('input',e=>{ui.q=e.target.value;render()});
$('fType').onchange=e=>{ui.filter=e.target.value;render()};$('fStage').onchange=e=>{ui.stage=e.target.value;render()};$('pfSel').onchange=e=>{ui.pf=e.target.value;render()};
$('fClear').onclick=()=>{ui.filter='all';ui.vpf='all';ui.stage='all';ui.q='';$('vSearch').value='';render()};$('fPlat').onchange=e=>{ui.vpf=e.target.value;render()};
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{ui.vview=b.dataset.v;ui.planning=null;render()});
$('editStatus').addEventListener('change',e=>{ui.editStatus=e.target.value});
$('editText').addEventListener('input',e=>{if(ui.draft)ui.draft.text=e.target.value});$('editDesc').addEventListener('input',e=>{if(ui.draft)ui.draft.desc=e.target.value});
$('addIdea').onclick=()=>openIdea(null);
const closeEdit=()=>{ui.editing=null;ui.editStatus=null;ui.draft=null;$('editDate').value='';render()};
$('editSched').onclick=()=>{const it=state.ideas.find(x=>x.id===ui.editing),k=$('editDate').value;if(!it||!k){toast('Pick a day first');return}
  const v=$('editText').value.trim();if(v)it.text=v;it.desc=$('editDesc').value.trim();it.types=ui.editTypes.length?ui.editTypes.slice():it.types;it.plats=ui.editPlats.slice();it.status=$('editStatus').value;
  ui.editing=null;ui.editStatus=null;ui.draft=null;$('editDate').value='';planIdea(it,k)};
$('editCancel').onclick=closeEdit;$('editModal').addEventListener('click',e=>{if(e.target.id==='editModal')closeEdit()});
$('editSave').onclick=()=>{const types=ui.editTypes.length?ui.editTypes.slice():['Long-form'],plats=ui.editPlats.slice(),status=$('editStatus').value;
  if(ui.editing==='new'&&ui.multi){const lines=$('editMulti').value.split('\n').map(x=>x.trim()).filter(Boolean);if(!lines.length){toast('Add at least one line');$('editMulti').focus();return}
    const now=Date.now();lines.forEach((l,i)=>state.ideas.push({id:uid(),text:l,desc:'',types:types.slice(),plats:plats.slice(),status,created:now+i}));ui.editing=null;ui.editStatus=null;ui.draft=null;ui.multi=false;commit();toast(lines.length+(lines.length===1?' idea':' ideas')+' added');return}
  const v=$('editText').value.trim(),d=$('editDesc').value.trim();if(!v){toast('Add a title');$('editText').focus();return}
  if(ui.editing==='new'){state.ideas.push({id:uid(),text:v,desc:d,types,plats,status,created:Date.now()});toast('Idea added')}
  else{const it=state.ideas.find(x=>x.id===ui.editing);if(it){Object.assign(it,{text:v,desc:d,types,plats,status,example:false})}toast('Idea saved')}
  ui.editing=null;ui.editStatus=null;ui.draft=null;commit()};
$('editDel').onclick=()=>{const b=$('editDel');if(b.dataset.sure){state.ideas=state.ideas.filter(x=>x.id!==ui.editing);ui.editing=null;b.dataset.sure='';b.textContent='Delete';commit();toast('Idea deleted')}else{b.dataset.sure='1';b.textContent='Tap again'}};
const openTags=()=>{ui.tags=true;ui.tagSure=null;renderTags()};document.querySelectorAll('[data-tags]').forEach(b=>b.onclick=openTags);
const closeTags=()=>{ui.tags=null;render()};$('tagClose').onclick=closeTags;$('tagModal').addEventListener('click',e=>{if(e.target.id==='tagModal')closeTags()});
$('tagAdd').onsubmit=e=>{e.preventDefault();const v=$('tagNewName').value.trim(),k=ui.tagKind;if(!v)return;if(TG(k).some(x=>x.n.toLowerCase()===v.toLowerCase())){toast('That tag already exists');return}
  TG(k).push({n:v,c:$('tagNewColor').value});$('tagNewName').value='';commit();$('tagNewName').focus();toast('Tag added')};
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(ui.anm){closeAn();return}if(ui.tags)closeTags();else if(ui.item)closeItem();else if(ui.editing)closeEdit()});
$('startFresh').onclick=()=>{state=fresh();state.begun=true;ui.sel=null;ui.month=null;ui.tab='track';renderTrack.once=false;commit();const sc=$('setupCard');sc.open=true;$('scroller').scrollTo({top:0,behavior:'smooth'});setTimeout(()=>{const f=sc.querySelector('input[type=checkbox]');if(f)f.focus({preventScroll:true})},300)};
// swipe between days / weeks on phone
(function(){let x0=null,y0=null;const el=$('week');
  el.addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY},{passive:true});
  el.addEventListener('touchend',e=>{if(x0==null)return;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;x0=null;
    if(Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.5)return;const k=parse(ui.pday||iso(today())),n=addDays(k,dx<0?1:-1),nk=iso(n);
    const ws=weekStart(ui.weekOff);if(n<ws){ui.weekOff--}else if(n>addDays(ws,6)){ui.weekOff++}ui.pday=nk;render()},{passive:true})})();
// app icon + manifest for Add to Home Screen
(function(){try{const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,512);gr.addColorStop(0,'#3a372f');gr.addColorStop(1,'#16150f');g.fillStyle=gr;g.fillRect(0,0,512,512);
  g.lineCap='round';g.lineWidth=52;g.strokeStyle='#3A93B4';g.beginPath();g.moveTo(96,320);g.bezierCurveTo(96,220,170,144,272,144);g.lineTo(368,144);g.stroke();
  g.strokeStyle='#55AECF';g.beginPath();g.moveTo(416,192);g.bezierCurveTo(416,292,342,368,240,368);g.lineTo(144,368);g.stroke();
  g.fillStyle='#E3B85A';g.beginPath();g.arc(256,256,38,0,Math.PI*2);g.fill();
  const url=c.toDataURL('image/png');const L=(rel,href)=>{const l=document.createElement('link');l.rel=rel;l.href=href;document.head.appendChild(l)};
  if(!document.querySelector('link[rel=apple-touch-icon]'))L('apple-touch-icon',url);if(!document.querySelector('link[rel=icon]'))L('icon',url);
  const m={name:'Signal Tracker',short_name:'Signal',display:'standalone',background_color:'#141412',theme_color:'#1b1a17',start_url:location.href,icons:document.querySelector('link[rel=apple-touch-icon]')?[{src:new URL('../assets/icons/icon-192.png',location.href).href,sizes:'192x192',type:'image/png'},{src:new URL('../assets/icons/icon-512.png',location.href).href,sizes:'512x512',type:'image/png',purpose:'any maskable'}]:[{src:url,sizes:'512x512',type:'image/png',purpose:'any maskable'}]};
  L('manifest',URL.createObjectURL(new Blob([JSON.stringify(m)],{type:'application/manifest+json'})))}catch(e){}})();
document.querySelectorAll('#anRange button').forEach(b=>b.onclick=()=>{ui.anR=b.dataset.r;renderStats()});
$('anPlat').onchange=e=>{ui.anP=e.target.value;renderStats()};
document.querySelectorAll('[data-fg]').forEach(b=>b.onclick=()=>{ui.fg=b.dataset.fg;renderStats()});
$('anLog').onclick=$('anLog2').onclick=()=>anModal('log');$('anPost').onclick=$('anPost2').onclick=()=>anModal('post');$('anData').onclick=$('anData2').onclick=()=>anModal('data');
$('anmCancel').onclick=closeAn;$('anmSave').onclick=saveAn;$('anModal').addEventListener('click',e=>{if(e.target.id==='anModal')closeAn()});
{let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(ui.tab==='stats')renderStats()},150)})}
$('scroller').addEventListener('scroll',hideTip,{passive:true});
weeklyReset();resetBox();render();
})();
