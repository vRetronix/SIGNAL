/* Signal — Copyright (C) 2026 Retronix. SPDX-License-Identifier: GPL-3.0-only. See LICENSE. */
/* Signal core: shared helpers, state, rendering loop. Load first.
   State: one object in localStorage (KEY). load() -> fixTasks() migrates old saves; commit() = save() + render().
   Data: tasks{daily,weekly}, days{n:{taskId:1}}, weeks{w:{taskId:1}}, reviews, grow, cycle/history,
         plan{iso:[item]}, repeats[], ideas[], tags{types,plats}, analytics{daily[],content[]}.
   Pages: tracker.js, planner.js, vault.js, stats.js. Shared editor and tags: editor.js. */
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

const cloneTags=()=>({types:DEFAULT_TAGS.types.map(([n,c])=>({n,c})),plats:DEFAULT_TAGS.plats.map(([n,c])=>({n,c}))});
const TG=k=>state.tags[k];
const tcol=(k,n)=>{const t=TG(k).find(x=>x.n===n);return t?t.c:'#77736A'};
const letter=n=>n==='YouTube'?'▶':n==='Shorts'?'S':n==='Brand deal'?'$':(n[0]||'?').toUpperCase();
const badge=n=>'<span class="badge" style="--c:'+esc(tcol('plats',n))+'" title="'+esc(n)+'">'+esc(letter(n))+'</span>';
const ttag=n=>'<span class="ttag" style="--c:'+esc(tcol('types',n))+'">'+esc(n)+'</span>';
function ideaTypes(x){if(x.types&&x.types.length)return x.types;const t=x.type||'';
  return [x.mode==='stream'||STREAM_TYPES.includes(t)?'Live':t==='Long video'?'Long-form':t==='Short'?'Short':t==='Clip'?'Clip':'Post']}
const ideaPlats=x=>x.plats||(x.platform?[x.platform]:[]);

function fixTasks(s){if(!s.tasks)s.tasks=cloneDef();if(!s.analytics)s.analytics=s.example?sampleAnalytics(today()):{daily:[],content:[],example:false};s.cycle=s.cycle||1;s.history=s.history||[];s.reviews=s.reviews||{};s.grow=s.grow||{};s.repeats=s.repeats||[];(s.tasks.daily||[]).forEach(t=>{if(t.d==='Film, edit or go live')t.d='Record, Edit, or Go Live'});(s.tasks.weekly||[]).forEach(t=>{if(t.k==='Check your numbers and note what worked')t.k='Look back on the week: what worked, what to try next'});
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
// Repeating posts: {id,text,desc,types,plats,time,days:[0-6],start,end,skip:{iso:1},done:{iso:1}}
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const repOn=(r,k)=>k>=r.start&&(!r.end||k<=r.end)&&r.days.includes(parse(k).getDay())&&!(r.skip||{})[k];
const repLabel=r=>r.days.length===7?'Every day':r.days.map(d=>WD[d]).join(' ');
const occ=(r,k)=>({id:r.id,rep:r,text:r.text,desc:r.desc||'',types:r.types||[],plats:r.plats||[],time:r.time||'',mode:(r.types||[]).includes('Live')?'stream':'content',done:!!(r.done||{})[k]});
function planOn(k){const out=(state.plan[k]||[]).slice();(state.repeats||[]).forEach(r=>{if(repOn(r,k))out.push(occ(r,k))});return out}
function setDone(k,it,v){if(it.rep){const d=it.rep.done=it.rep.done||{};if(v)d[k]=1;else delete d[k]}else it.done=v}
function doneIn(a,b){const out=[];Object.keys(state.plan).forEach(k=>{if(k>=a&&k<=b)state.plan[k].forEach(x=>{if(x.done)out.push([k,x])})});
  (state.repeats||[]).forEach(r=>Object.keys(r.done||{}).forEach(k=>{if(k>=a&&k<=b)out.push([k,occ(r,k)])}));return out.sort((x,y)=>x[0].localeCompare(y[0]))}
const calm=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const toTop=()=>$('scroller').scrollTo({top:0,behavior:calm()?'auto':'smooth'});
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

function fresh(){return {v:3,analytics:{daily:[],content:[],example:false},cycle:1,history:[],reviews:{},grow:{},tasks:state&&state.tasks?state.tasks:cloneDef(),tags:state&&state.tags?state.tags:cloneTags(),example:false,edition:state?state.edition:'creator',start:iso(today()),days:{},weeks:{},months:{},setup:[0,0,0,0,0,0,0],pillars:['Pillar 1','Pillar 2','Pillar 3'],ideas:[],plan:{},repeats:[]}}
function migrate(s){s.v=2;const m=x=>x.mode||((STREAM_TYPES.includes(x.type)||x.type==='Stream'||x.type==='Collab'||((x.platform==='Kick'||x.platform==='Twitch')&&!x.type))?'stream':'content');
  (s.ideas||[]).forEach(x=>{x.mode=m(x);x.stage=x.stage||0;if(x.mode==='stream'&&!STREAM_TYPES.includes(x.type))x.type='Main stream'});
  Object.values(s.plan||{}).forEach(a=>a.forEach(x=>{x.mode=m(x);x.type=x.type||(x.mode==='stream'?'Main stream':'Post');x.time=x.time||''}));return s}
function toV3(s){s.v=3;s.tags=s.tags||cloneTags();(s.ideas||[]).forEach(x=>{x.types=ideaTypes(x);x.plats=ideaPlats(x);delete x.type;delete x.platform;delete x.mode;delete x.stage;delete x.pillar});
  Object.values(s.plan||{}).forEach(a=>a.forEach(x=>{x.types=ideaTypes(x);x.plats=ideaPlats(x);delete x.type;delete x.platform}));return s}
function load(){try{const r=localStorage.getItem(KEY);if(r){const s=JSON.parse(r);if(s&&s.v===3)return fixTasks(s);if(s&&s.v===2)return fixTasks(toV3(s))}const o=localStorage.getItem(OLDKEY);if(o){const s=JSON.parse(o);if(s&&s.v===1)return fixTasks(toV3(migrate(s)))}}catch(e){}return fixTasks(sample())}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}


const ui={anR:'30',anP:'all',fg:'pct',anSort:'views',anm:null,vview:'list',stage:'all',pday:null,tab:'track',month:null,sel:null,weekOff:0,mode:null,pf:'all',tags:null,tagKind:'types',filter:'all',vpf:'all',q:'',ed:null,recap:null,fmenu:false,anMore:false};
const $=id=>document.getElementById(id);
let state=null;
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

function chip(kind,name,on,n,fn,id){const b=document.createElement('button');b.type='button';b.className='tchip';b.id=id;
  b.style.setProperty('--c',name==='all'?'var(--munsell)':tcol(kind,name));b.setAttribute('aria-pressed',!!on);
  b.innerHTML=(name==='all'?'':'<i></i>')+esc(name==='all'?'All':name)+(n!=null?' <span class="n">'+n+'</span>':'');b.onclick=fn;return b}
const slug=n=>n.replace(/[^a-z0-9]/gi,'');
const toggle=(arr,n)=>arr.includes(n)?arr.filter(x=>x!==n):arr.concat(n);
const lockSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
const clockSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

function render(){renderShell();({track:renderTrack,plan:renderPlan,vault:renderVault,stats:renderStats})[ui.tab]();renderEd();renderTags()}
function commit(){save();render()}

document.querySelectorAll('.bnav button').forEach(b=>b.onclick=()=>{ui.tab=b.dataset.tab;ui.ed=null;ui.fmenu=false;render();$('scroller').scrollTo(0,0)});

document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(ui.anm){closeAn();return}if(ui.tags)closeTags();else if(ui.recap)closeRecap();else if(ui.ed)closeEd();else if(ui.fmenu){ui.fmenu=false;render()}});

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

// Start once every script has loaded
document.addEventListener('DOMContentLoaded',()=>{state=load();weeklyReset();resetBox();render()});
