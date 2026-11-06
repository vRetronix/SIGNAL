/* Signal — Copyright (C) 2026 Retronix. SPDX-License-Identifier: GPL-3.0-only. See LICENSE. */
/* One editor for ideas (no day) and planner posts (a day), plus the tag manager. */
// One editor for ideas, planner posts and repeating posts. No day = Idea Vault. A day = Planner.
function openEd(o){const it=o.idea||o.it||null,r=it&&it.rep;
  ui.ed={src:o.idea?'idea':r?'rep':o.it?'plan':null,id:r?r.id:it?it.id:null,orig:o.k||null,occ:r?o.k:null,
    text:it?it.text:'',desc:it?(it.desc||''):'',types:it?(it.types||[]).slice():[],plats:it?(it.plats||[]).slice():[],
    status:o.idea?stageOf(it):(it?'Ready To Post':'Idea'),date:r?r.start:(o.k||o.date||''),time:it?(it.time||''):'',
    days:r?r.days.slice():[],done:!!(it&&it.done),from:'',multi:false,sure:false};
  render();setTimeout(()=>$('edText').focus(),0)}
const closeEd=()=>{ui.ed=null;render()};
function renderEd(){const D=ui.ed;$('edModal').hidden=!D;if(!D)return;
  const dated=!!D.date,live=D.types.includes('Live'),isNew=!D.id,multi=isNew&&D.multi,repeat=dated&&D.days.length>0;
  $('edTitle').textContent=(isNew?'New ':'Edit ')+(!dated?'idea':live?'stream':'post');
  $('edMultiBtn').hidden=!isNew;$('edMultiBtn').textContent=multi?'Add one':'Add several';
  $('edOneWrap').hidden=multi;$('edDescWrap').hidden=multi;$('edMultiWrap').hidden=!multi;
  const fw=$('edFromWrap');fw.hidden=!(isNew&&dated&&!multi&&state.ideas.length);
  if(!fw.hidden){const fv=$('edFrom');fv.innerHTML='<option value="">None</option>'+state.ideas.slice().sort((a,b)=>(b.created||0)-(a.created||0)).map(x=>'<option value="'+x.id+'">'+esc(x.text)+'</option>').join('');fv.value=D.from}
  if(document.activeElement!==$('edText'))$('edText').value=D.text;if(document.activeElement!==$('edDesc'))$('edDesc').value=D.desc;
  const ty=$('edTypes');ty.innerHTML='';TG('types').forEach(({n})=>ty.appendChild(chip('types',n,D.types.includes(n),null,()=>{D.types=toggle(D.types,n);renderEd()},'ed-t-'+slug(n))));
  const pl=$('edPlats');pl.innerHTML='';TG('plats').forEach(({n})=>pl.appendChild(chip('plats',n,D.plats.includes(n),null,()=>{D.plats=toggle(D.plats,n);renderEd()},'ed-p-'+slug(n))));
  if(document.activeElement!==$('edDate'))$('edDate').value=D.date;$('edDayLbl').textContent=repeat?'Starts':'Day';$('edClear').hidden=!dated;
  $('edTimeWrap').hidden=!dated;$('edTime').value=D.time;$('edTimeLbl').textContent=live?'Lock-in time':'Time';
  const st=$('edStatusWrap');st.hidden=dated;if(!dated){const es=$('edStatus');if(!es.options.length)es.innerHTML=STAGES.map(([n])=>'<option>'+n+'</option>').join('');es.value=D.status}
  $('edRepWrap').hidden=!dated;$('edEvery').textContent=D.days.length===7?'Clear':'Every day';
  const wd=$('edDays');wd.innerHTML='';[0,1,2,3,4,5,6].forEach(i=>{const b=document.createElement('button');b.type='button';b.className='wd';b.textContent=WD[i][0];
    b.setAttribute('aria-label',WD[i]);b.setAttribute('aria-pressed',D.days.includes(i));b.onclick=()=>{D.days=toggle(D.days,i).sort((a,b)=>a-b);renderEd()};wd.appendChild(b)});
  const dw=$('edDoneWrap');dw.hidden=!dated||(repeat&&D.src!=='rep');
  const dl=(live?'Streamed':'Posted')+(D.src==='rep'&&repeat?' '+fmt(parse(D.occ)):'');$('edDoneLbl').textContent=dl;$('edDone').setAttribute('aria-label',dl);$('edDone').setAttribute('aria-checked',D.done);
  $('edDel').hidden=isNew;$('edDel').textContent=D.sure?(D.src==='rep'?'Delete every day':'Tap again to delete'):'Delete';
  $('edSkip').hidden=D.src!=='rep';$('edSave').textContent=isNew?'Add':'Save'}
function saveEd(){const D=ui.ed;D.text=$('edText').value.trim();D.desc=$('edDesc').value.trim();D.date=$('edDate').value;D.time=$('edTime').value;if(!D.date)D.days=[];
  const many=!D.id&&D.multi,lines=many?$('edMulti').value.split('\n').map(x=>x.trim()).filter(Boolean):(D.text?[D.text]:[]);
  if(!lines.length){toast(many?'Add at least one line':'Add a title');$(many?'edMulti':'edText').focus();return}
  const base=t=>({text:t,desc:many?'':D.desc,types:D.types.slice(),plats:D.plats.slice()});
  let keep=null;
  if(D.src==='idea'){keep=state.ideas.find(x=>x.id===D.id);state.ideas=state.ideas.filter(x=>x!==keep)}
  else if(D.src==='plan'){const a=state.plan[D.orig]||[];keep=a.find(x=>x.id===D.id);state.plan[D.orig]=a.filter(x=>x!==keep);if(!state.plan[D.orig].length)delete state.plan[D.orig]}
  else if(D.src==='rep'){const r=state.repeats.find(x=>x.id===D.id);
    if(r&&D.days.length){Object.assign(r,base(lines[0]),{time:D.time,days:D.days.slice(),start:D.date});setDone(D.occ,{rep:r},D.done);ui.ed=null;commit();toast('Saved');return}
    if(r){const y=iso(addDays(today(),-1));if(r.start<=y)r.end=y;else state.repeats=state.repeats.filter(x=>x!==r)}}
  if(D.from)state.ideas=state.ideas.filter(x=>x.id!==D.from);
  const now=Date.now(),id=i=>i===0&&keep?keep.id:uid();
  lines.forEach((t,i)=>{
    if(!D.date)state.ideas.push(Object.assign({id:id(i),status:D.status,created:keep&&keep.created||now+i},base(t)));
    else if(D.days.length)state.repeats.push(Object.assign({id:uid(),time:D.time,days:D.days.slice(),start:D.date,end:null,skip:{},done:{}},base(t)));
    else(state.plan[D.date]=state.plan[D.date]||[]).push(Object.assign({id:id(i),mode:D.types.includes('Live')?'stream':'content',time:D.time,done:D.done},base(t)))});
  if(D.date&&ui.tab==='plan'){ui.weekOff=Math.floor((utc(parse(D.date))-utc(weekStart(0)))/(7*DAY));ui.pday=D.date}
  ui.ed=null;commit();
  toast(!D.date?(lines.length>1?lines.length+' ideas added':'Saved to Idea Vault'):D.days.length?'Repeats '+repLabel(D):'Saved to '+fmt(parse(D.date)))}
$('edText').addEventListener('input',e=>{if(ui.ed)ui.ed.text=e.target.value});
$('edDesc').addEventListener('input',e=>{if(ui.ed)ui.ed.desc=e.target.value});
$('edDate').addEventListener('change',e=>{if(ui.ed){ui.ed.date=e.target.value;if(!ui.ed.date)ui.ed.days=[];renderEd()}});
$('edClear').onclick=()=>{ui.ed.date='';ui.ed.days=[];renderEd()};
$('edTime').addEventListener('change',e=>{if(ui.ed)ui.ed.time=e.target.value});
$('edStatus').addEventListener('change',e=>{if(ui.ed)ui.ed.status=e.target.value});
$('edEvery').onclick=()=>{const D=ui.ed;D.days=D.days.length===7?[]:[0,1,2,3,4,5,6];renderEd()};
$('edDone').onclick=()=>{ui.ed.done=!ui.ed.done;renderEd()};
$('edFrom').onchange=e=>{const D=ui.ed,x=state.ideas.find(i=>i.id===e.target.value);D.from=e.target.value;if(x){D.text=x.text;D.desc=x.desc||'';D.types=(x.types||[]).slice();D.plats=(x.plats||[]).slice();$('edText').value=x.text}renderEd()};
$('edMultiBtn').onclick=()=>{ui.ed.multi=!ui.ed.multi;renderEd();setTimeout(()=>$(ui.ed.multi?'edMulti':'edText').focus(),0)};
$('edSave').onclick=saveEd;$('edCancel').onclick=closeEd;$('edModal').addEventListener('click',e=>{if(e.target.id==='edModal')closeEd()});
$('edDel').onclick=()=>{const D=ui.ed;if(!D.sure){D.sure=true;renderEd();return}
  if(D.src==='idea')state.ideas=state.ideas.filter(x=>x.id!==D.id);
  else if(D.src==='plan'){state.plan[D.orig]=(state.plan[D.orig]||[]).filter(x=>x.id!==D.id);if(!state.plan[D.orig].length)delete state.plan[D.orig]}
  else state.repeats=state.repeats.filter(x=>x.id!==D.id);
  ui.ed=null;commit();toast('Deleted')};
$('edSkip').onclick=()=>{const D=ui.ed,r=state.repeats.find(x=>x.id===D.id);if(r)(r.skip=r.skip||{})[D.occ]=1;ui.ed=null;commit();toast('Skipped '+fmt(parse(D.occ)))};


// tag manager
function eachTagged(fn){state.ideas.forEach(fn);Object.values(state.plan).forEach(a=>a.forEach(fn));state.repeats.forEach(fn)}
function usage(kind,n){let c=0;eachTagged(x=>{if((x[kind]||[]).includes(n))c++});return c}
function renameTag(kind,oldN,newN){eachTagged(x=>{if(x[kind])x[kind]=x[kind].map(v=>v===oldN?newN:v)});
  if(ui.ed)ui.ed[kind]=ui.ed[kind].map(v=>v===oldN?newN:v)}
function deleteTag(kind,n){state.tags[kind]=state.tags[kind].filter(x=>x.n!==n);eachTagged(x=>{if(x[kind])x[kind]=x[kind].filter(v=>v!==n)});if(ui.ed)ui.ed[kind]=ui.ed[kind].filter(v=>v!==n)}
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

const openTags=()=>{ui.tags=true;ui.tagSure=null;renderTags()};document.querySelectorAll('[data-tags]').forEach(b=>b.onclick=openTags);
const closeTags=()=>{ui.tags=null;render()};$('tagClose').onclick=closeTags;$('tagModal').addEventListener('click',e=>{if(e.target.id==='tagModal')closeTags()});
$('tagAdd').onsubmit=e=>{e.preventDefault();const v=$('tagNewName').value.trim(),k=ui.tagKind;if(!v)return;if(TG(k).some(x=>x.n.toLowerCase()===v.toLowerCase())){toast('That tag already exists');return}
  TG(k).push({n:v,c:$('tagNewColor').value});$('tagNewName').value='';commit();$('tagNewName').focus();toast('Tag added')};
