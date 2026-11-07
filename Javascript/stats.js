/* Signal — Copyright (C) 2026 Retronix. SPDX-License-Identifier: GPL-3.0-only. See LICENSE. */
/* Statistics: charts, stats entry and import. */
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
// Before Start Here is pressed (and before any real stats are logged), Statistics shows sample data
let sampleAn=null;
const previewing=()=>state.begun===false&&!state.example&&!(state.analytics.daily.length||state.analytics.content.length);
const AN=()=>previewing()?(sampleAn=sampleAn||sampleAnalytics(today())):state.analytics;
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
  {const pn=doneIn(iso(a),iso(b)).filter(([k,x])=>P==='all'||(x.plats||[]).includes(P)).length,pp=doneIn(iso(pa),iso(pb)).filter(([k,x])=>P==='all'||(x.plats||[]).includes(P)).length,
    fc=folStart?(folNow-folStart)/folStart*100:0,st=streak(),bs=best();
    $('anLead').innerHTML='<div class="kpi"><span class="sk">Posts</span><b>'+pn+'</b>'+(pp?dl(pn,pp):'<span class="dl">—</span>')+spark(dates.map(k=>planOn(k).filter(x=>x.done&&(P==='all'||(x.plats||[]).includes(P))).length),'var(--gold)')+'</div>'+
      '<div class="kpi"><span class="sk">Streak</span><b>'+st+'</b><span class="dl">Best '+bs+'</span></div>'+
      '<div class="kpi"><span class="sk">'+(P!=='all'?folLabel(P):'Followers')+'</span><b>'+(folStart?fmtP(fc):'—')+'</b><span class="dl'+(folNow>folStart?' up':'')+'">'+fmtN(folNow)+' total</span>'+spark(folSeries,'var(--munsell-hi)')+'</div>'}
  $('anMore').open=ui.anMore;
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
  const posted=wks.map(ks=>{const titles=new Set();ks.forEach(k=>planOn(k).forEach(x=>{if(x.done&&(P==='all'||(x.plats||[]).includes(P)))titles.add(k+x.text)}));A.content.forEach(c=>{if(ks.includes(c.date)&&(P==='all'||c.plat===P))titles.add(c.date+c.title)});return titles.size});
  const wv=wks.map(ks=>sum(R.filter(r=>ks.includes(r.date)),'views')),lbl=wks.map(ks=>dShort(ks[0]));
  barChart($('chPosts'),{labels:lbl,vals:posted,color:'var(--gold)',yFmt:v=>Math.round(v)+'',H:110,xEvery:Math.ceil(wks.length/7),tips:wks.map((ks,i)=>'<div class="th">Week of '+dShort(ks[0])+'</div><div class="tr2"><span>Posts</span><b>'+posted[i]+'</b></div>')});
  barChart($('chWkViews'),{labels:lbl,vals:wv,color:'var(--munsell-hi)',yFmt:fmtN,H:110,xEvery:Math.ceil(wks.length/7),tips:wks.map((ks,i)=>'<div class="th">Week of '+dShort(ks[0])+'</div><div class="tr2"><span>Views</span><b>'+wv[i].toLocaleString()+'</b></div>')});
  const cs=cycleStats();let pl=0,pd=0;dates.forEach(k=>{if(k<=iso(today()))planOn(k).forEach(x=>{pl++;if(x.done)pd++})});
  $('conStats').innerHTML='<div><b>'+cs.days+'</b><span>Days</span></div><div><b>'+cs.best+'</b><span>Best streak</span></div><div><b>'+(pl?Math.round(pd/pl*100)+'%':'—')+'</b><span>Follow-through</span></div>';
}
// data entry
function anModal(kind){ui.anm=kind;const B=$('anmBody'),t=iso(today()),pl=TG('plats').map(x=>'<option>'+esc(x.n)+'</option>').join('');$('anModal').hidden=false;
  if(kind==='log'){$('anmTitle').textContent='Log stats';$('anmSave').textContent='Save';
    B.innerHTML='<div class="anform"><label class="field"><span>Date</span><input class="inp" type="date" id="lgDate" value="'+t+'"></label><label class="field"><span>Platform</span><select class="inp" id="lgPlat">'+pl+'</select></label><label class="field"><span id="lgFolL">Followers</span><input class="inp" type="number" min="0" id="lgFol"></label><label class="field"><span>Views</span><input class="inp" type="number" min="0" id="lgViews"></label><label class="field"><span>Avg viewers</span><input class="inp" type="number" min="0" id="lgAvg"></label><label class="field"><span>Peak viewers</span><input class="inp" type="number" min="0" id="lgPeak"></label><label class="field"><span>Hours streamed</span><input class="inp" type="number" min="0" step="0.1" id="lgHours"></label></div>';
    if(ui.anP!=='all')$('lgPlat').value=ui.anP;const sync=()=>{$('lgFolL').textContent=folLabel($('lgPlat').value)};$('lgPlat').onchange=sync;sync()}
  else if(kind==='post'){$('anmTitle').textContent='Add post result';$('anmSave').textContent='Add';
    const done=doneIn('0000','9999').reverse().map(([k,x])=>({k,x}));
    B.innerHTML='<div class="anform">'+(done.length?'<label class="field full"><span>From your planner</span><select class="inp" id="poFrom"><option value="">Type it in</option>'+done.slice(0,40).map((d,i)=>'<option value="'+i+'">'+esc(d.x.text)+' · '+dShort(d.k)+'</option>').join('')+'</select></label>':'')+'<label class="field full"><span>Title</span><input class="inp" id="poTitle" autocomplete="off"></label><label class="field"><span>Platform</span><select class="inp" id="poPlat">'+pl+'</select></label><label class="field"><span>Date posted</span><input class="inp" type="date" id="poDate" value="'+t+'"></label><label class="field"><span>Views</span><input class="inp" type="number" min="0" id="poViews"></label><label class="field"><span>Likes</span><input class="inp" type="number" min="0" id="poLikes"></label><label class="field"><span>Comments</span><input class="inp" type="number" min="0" id="poCom"></label></div>';
    const f=$('poFrom');if(f)f.onchange=()=>{const d=done[+f.value];if(!d)return;$('poTitle').value=d.x.text;$('poDate').value=d.k;if((d.x.plats||[])[0])$('poPlat').value=d.x.plats[0]}}
  else{$('anmTitle').textContent='Data';$('anmSave').textContent='Import';
    B.innerHTML='<div class="anform"><textarea class="inp full" id="anJson" spellcheck="false" placeholder=\'{"daily":[{"date":"2026-11-01","plat":"Kick","followers":590,"views":420,"viewers":23,"peak":41,"hours":3.5}],"content":[{"title":"Heist night","plat":"Kick","date":"2026-11-01","views":1100,"likes":0,"comments":290}]}\'></textarea></div><div class="acts" style="justify-content:space-between;flex-wrap:wrap"><button class="link" id="anCopy" type="button">Copy</button>'+(AN().example?'<button class="link danger" id="anClear" type="button">Clear example data</button>':'<button class="link danger" id="anClear" type="button">Clear all</button>')+'</div>';
    $('anCopy').onclick=()=>{const txt=JSON.stringify({daily:AN().daily,content:AN().content});$('anJson').value=txt;try{navigator.clipboard.writeText(txt).then(()=>toast('Copied'),()=>{$('anJson').select();toast('Select and copy the text')})}catch(e){$('anJson').select()}};
    $('anClear').onclick=()=>{const b=$('anClear');if(!b.dataset.sure){b.dataset.sure=1;b.textContent='Tap again to clear';return}state.analytics={daily:[],content:[],example:false};closeAn();commit();toast('Stats cleared')}}
  setTimeout(()=>{const f=B.querySelector('input:not([type=date]),textarea');if(f)f.focus()},0)}
function closeAn(){$('anModal').hidden=true;ui.anm=null}
function ingest(data){const A=state.analytics;if(A.example){A.daily=[];A.content=[];A.example=false}let nd=0,nc=0;
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

document.querySelectorAll('#anRange button').forEach(b=>b.onclick=()=>{ui.anR=b.dataset.r;renderStats()});
$('anPlat').onchange=e=>{ui.anP=e.target.value;renderStats()};
document.querySelectorAll('[data-fg]').forEach(b=>b.onclick=()=>{ui.fg=b.dataset.fg;renderStats()});
$('anLog').onclick=$('anLog2').onclick=()=>anModal('log');$('anPost').onclick=$('anPost2').onclick=()=>anModal('post');$('anData').onclick=$('anData2').onclick=()=>anModal('data');
$('anmCancel').onclick=closeAn;$('anmSave').onclick=saveAn;$('anModal').addEventListener('click',e=>{if(e.target.id==='anModal')closeAn()});
{let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(ui.tab==='stats')renderStats()},150)})}
$('scroller').addEventListener('scroll',hideTip,{passive:true});
$('anMore').addEventListener('toggle',()=>{ui.anMore=$('anMore').open;if(ui.anMore)renderStats()});
