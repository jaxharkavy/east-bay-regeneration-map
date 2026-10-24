import React,{useState,useEffect,useRef} from 'react';
import {Link} from 'react-router-dom';
import {Play as PlayIcon,Pause,FastForward,RotateCcw,ArrowUpRight,ArrowRight,CalendarDays,MapPin,Info} from 'lucide-react';
import {categories} from '../../server/validation.mjs';
import {GW,GH,YEARS,FLATS,LEVELS,TOOLS,TILE_NAMES,GOALS,LESSONS,QUIZ,DECISION_YEAR,creekX,idx,slopeAt,canPaint,planCost,tileFor,newRun,simYear,applyDecision,decisionSpots,results,lessonCategories,matchEvents,quizScore,clamp} from './watershed.mjs';
import './play.css';
const YEAR_MS=1100;
const COL={O:'#5b8a4c',G:'#d8c37c',K:'#bccb83',N:'#86ad6f',C:'#9b7a52',H:'#d9d4c6',L:'#9fa19b',B:'#5e4a3e',R:'#a9c48a',P:'#c9c4b5'};
const SWATCH={N:'#86ad6f',O:'#3f6e3a',K:'#bccb83',C:'#9b7a52',D:'#4f8fb0',H:'#c4654d',X:'#9aa196'};
const TIPS={G:'dry grass burns fast in summer',L:'all pavement: rain runs straight off',P:'buried creek: use Daylight creek to open it',B:'bare soil washes into the creek in storms',H:'existing homes stay as they are',R:'the open creek stays as it is'};
const categoryClass=c=>['garden','food','nature','learn','care'][categories.indexOf(c)]||'garden';
const fmt=(d,o)=>new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',...o}).format(new Date(d));
const hash=(i,k)=>{const v=Math.sin(i*12.9898+k*78.233)*43758.5453;return v-Math.floor(v);};
function mix(h1,h2,t){const p=h=>[1,3,5].map(k=>parseInt(h.slice(k,k+2),16)),a=p(h1),b=p(h2);return `rgb(${a.map((v,k)=>Math.round(v+(b[k]-v)*t)).join(',')})`;}

function drawTile(ctx,S,c,i,now,o){
 const x=(i%GW)*S,y=((i/GW)|0)*S,r=k=>hash(i,k);
 ctx.fillStyle=COL[c.t];ctx.fillRect(x,y,S+.5,S+.5);
 ctx.fillStyle=`rgba(255,255,255,${slopeAt(i%GW,(i/GW)|0)*.12})`;ctx.fillRect(x,y,S,S*.45);
 ctx.lineWidth=Math.max(1,S/22);
 switch(c.t){
  case 'O':{const g=Math.min(1,.45+c.age/8);for(let k=0;k<3;k++){const cx=x+S*(.22+.56*r(k)),cy=y+S*(.22+.56*r(k+5)),rr=S*.2*g;ctx.fillStyle='#2f5531';ctx.beginPath();ctx.arc(cx,cy+rr*.25,rr,0,7);ctx.fill();ctx.fillStyle='#6d9a5a';ctx.beginPath();ctx.arc(cx-rr*.25,cy-rr*.2,rr*.6,0,7);ctx.fill();}break;}
  case 'G':ctx.strokeStyle='rgba(140,110,40,.55)';for(let k=0;k<5;k++){const gx=x+S*r(k),gy=y+S*(.3+.6*r(k+9));ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(gx+S*.05,gy-S*.14);ctx.stroke();}break;
  case 'K':{ctx.strokeStyle='rgba(90,110,50,.4)';for(let k=0;k<4;k++){const gx=x+S*r(k),gy=y+S*(.3+.6*r(k+9));ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(gx+S*.03,gy-S*.06);ctx.stroke();}
   const gx=x+S*(.3+.35*(Math.sin(now/1800+i*2)+1)/2),gy=y+S*(.45+.2*r(3));ctx.fillStyle='#f6f2e6';ctx.beginPath();ctx.ellipse(gx,gy,S*.13,S*.08,0,0,7);ctx.fill();ctx.fillStyle='#3b3b36';ctx.beginPath();ctx.arc(gx+S*.13,gy-S*.04,S*.045,0,7);ctx.fill();break;}
  case 'N':{const g=Math.min(1,.5+c.age/3);for(let k=0;k<5;k++){const cx=x+S*(.15+.7*r(k)),cy=y+S*(.15+.7*r(k+4));ctx.fillStyle='#4d7c45';ctx.beginPath();ctx.arc(cx,cy,S*.09*g,0,7);ctx.fill();ctx.fillStyle=['#8e6bb8','#f2c94c','#e8875f'][k%3];ctx.beginPath();ctx.arc(cx+S*.03,cy-S*.03,S*.03*g,0,7);ctx.fill();}break;}
  case 'C':{ctx.strokeStyle='#6f5436';for(let k=1;k<4;k++){ctx.beginPath();ctx.moveTo(x+S*.1,y+k*S/4);ctx.lineTo(x+S*.9,y+k*S/4);ctx.stroke();}for(let k=0;k<6;k++){ctx.fillStyle=k%2?'#6aa84f':'#8bc34a';ctx.beginPath();ctx.arc(x+S*(.2+.3*(k%3)),y+S*(.19+.25*Math.floor(k/3)),S*.07,0,7);ctx.fill();}ctx.fillStyle='#d9534f';ctx.beginPath();ctx.arc(x+S*.53,y+S*.66,S*.04,0,7);ctx.fill();break;}
  case 'H':{const hx=x+S*.18,hy=y+S*.4,hw=S*.64,hh=S*.42;ctx.fillStyle='#f4efe4';ctx.fillRect(hx,hy,hw,hh);ctx.fillStyle=o.burnt?'#3b2c25':'#a85a43';ctx.beginPath();ctx.moveTo(hx-S*.06,hy);ctx.lineTo(hx+hw/2,y+S*.12);ctx.lineTo(hx+hw+S*.06,hy);ctx.fill();ctx.fillStyle='#e0b44c';ctx.fillRect(hx+hw*.38,hy+hh*.32,hw*.24,hh*.36);
   if(o.flooded){ctx.fillStyle=`rgba(70,140,190,${.5+.15*Math.sin(now/200+i)})`;ctx.fillRect(x,y+S*.6,S,S*.4);}break;}
  case 'L':{ctx.strokeStyle='rgba(255,255,255,.75)';for(let k=1;k<4;k++){ctx.beginPath();ctx.moveTo(x+k*S/4,y+S*.08);ctx.lineTo(x+k*S/4,y+S*.42);ctx.stroke();}ctx.fillStyle=['#c4654d','#4f8fb0','#e0b44c'][Math.floor(r(2)*3)];ctx.fillRect(x+S*(.12+.5*r(4)),y+S*.55,S*.28,S*.3);break;}
  case 'B':{ctx.strokeStyle='#2f241e';ctx.lineWidth=Math.max(1.2,S/16);for(let k=0;k<3;k++){const sx=x+S*(.2+.6*r(k)),sy=y+S*(.35+.5*r(k+3));ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+S*.04,sy-S*.2);ctx.stroke();}break;}
  case 'P':ctx.fillStyle='#8f918b';ctx.beginPath();ctx.arc(x+S/2,y+S/2,S*.13,0,7);ctx.fill();ctx.strokeStyle='#6e706a';ctx.stroke();break;
 }
 if(c.lit&&o.fire){const f=.5+.5*Math.sin(now/90+i*3);ctx.fillStyle=`rgba(255,${120+60*f|0},40,${.4+.2*f})`;ctx.fillRect(x,y,S,S);ctx.fillStyle='#ffcf5a';for(let k=0;k<2;k++){const fx=x+S*(.3+.4*r(k+7)),fy=y+S*.75;ctx.beginPath();ctx.moveTo(fx-S*.08,fy);ctx.quadraticCurveTo(fx,fy-S*(.35+.15*f),fx+S*.08,fy);ctx.fill();}}
 if(o.planned){ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.strokeRect(x+2,y+2,S-4,S-4);ctx.setLineDash([]);}
}
function drawCreek(ctx,S,grid,sn,now){
 const pt=y=>{const yy=Math.max(0,Math.min(GH-1,y));return [creekX(yy)*S+S/2,y*S+S/2];};
 const health=sn?sn.creek:70,mud=sn?sn.muddy:5,dry=sn?.ev?.kind==='drought';
 ctx.lineCap='round';
 for(let y=0;y<GH;y++){const t=grid[idx(creekX(y),y)].t,[x0,y0]=pt(y-.5),[x1,y1]=pt(y),[x2,y2]=pt(y+.5);
  const a=[(x0+x1)/2,y1-S/2],b=[(x1+x2)/2,y1+S/2];
  ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(x1,y1);ctx.lineTo(...b);
  if(t==='R'){ctx.strokeStyle='#cdbf94';ctx.lineWidth=S*.8;ctx.stroke();ctx.strokeStyle=mix('#4f9fc9','#8f6b3c',mud/100);ctx.lineWidth=Math.max(3,S*(.18+.4*health/100)*(dry?.5:1));ctx.stroke();
   ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=Math.max(1,S*.05);ctx.setLineDash([S*.2,S*.5]);ctx.lineDashOffset=-now/40;ctx.stroke();ctx.setLineDash([]);}
  else{ctx.strokeStyle='rgba(79,143,176,.55)';ctx.lineWidth=Math.max(2,S*.1);ctx.setLineDash([S*.15,S*.15]);ctx.stroke();ctx.setLineDash([]);}}
}
function drawBubbles(ctx,S,sn){
 ctx.font=`700 ${Math.max(11,Math.round(S*.3))}px Arial, Helvetica, sans-serif`;const used=[];
 sn.quotes.forEach((q,k)=>{if(q.i<0)return;const tx=(q.i%GW+.5)*S,ty=((q.i/GW)|0)*S,pad=7,maxW=S*5;
  const lines=[];let line='';q.text.split(' ').forEach(w=>{const t=line?line+' '+w:w;if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=w;}else line=t;});lines.push(line);
  const lh=Math.max(14,S*.38),bw=Math.max(...lines.map(l=>ctx.measureText(l).width))+pad*2,bh=lines.length*lh+pad*1.4;
  const bx=Math.min(Math.max(4,tx-bw/2),S*GW-bw-4);let by=ty-bh-8-k*4;if(by<4)by=ty+S+8;while(used.some(u=>Math.abs(u-by)<bh))by+=bh+4;used.push(by);
  ctx.fillStyle='rgba(255,254,250,.97)';ctx.beginPath();ctx.roundRect(bx,by,bw,bh,8);ctx.fill();
  const ax=Math.min(Math.max(tx,bx+10),bx+bw-10),above=by<ty;ctx.beginPath();ctx.moveTo(ax-5,by+(above?bh:0));ctx.lineTo(tx,above?ty+2:ty+S-2);ctx.lineTo(ax+5,by+(above?bh:0));ctx.fill();
  ctx.fillStyle='#253e32';lines.forEach((l,j)=>ctx.fillText(l,bx+pad,by+pad+lh*(j+.75)));});
}
function draw(ctx,g,now){
 const S=g.S,sn=curSnap(g),grid=g.phase==='plan'?g.base.map((c,i)=>g.plan[i]?{t:g.plan[i],age:3,planned:true}:c):sn.grid;
 ctx.save();if(g.shake>0){ctx.translate((Math.random()-.5)*g.shake,(Math.random()-.5)*g.shake);g.shake*=.9;if(g.shake<.4)g.shake=0;}
 ctx.fillStyle='#1f3328';ctx.fillRect(-20,-20,S*GW+40,S*GH+40);
 const flooded=new Set();if(sn?.flooded){for(let i=grid.length-1;i>=FLATS*GW&&flooded.size<sn.flooded;i--)if(grid[i].t==='H')flooded.add(i);}
 const fire=sn?.ev?.kind==='fire';
 grid.forEach((c,i)=>drawTile(ctx,S,c,i,now,{planned:c.planned,flooded:flooded.has(i),fire}));
 drawCreek(ctx,S,grid,sn,now);
 if(g.phase==='plan'&&g.hover>=0){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect((g.hover%GW)*S+1,((g.hover/GW)|0)*S+1,S-2,S-2);}
 if(sn){const kind=sn.ev.kind;
  if(kind==='drought'){ctx.fillStyle='rgba(255,180,70,.16)';ctx.fillRect(0,0,S*GW,S*GH);}
  if(kind==='fire'){ctx.fillStyle='rgba(230,110,40,.13)';ctx.fillRect(0,0,S*GW,S*GH);}
  if(kind==='storm'){ctx.fillStyle='rgba(15,25,45,.28)';ctx.fillRect(0,0,S*GW,S*GH);ctx.strokeStyle='rgba(200,230,255,.55)';ctx.lineWidth=1;
   for(let k=0;k<120;k++){const rx=(hash(k,1)*S*GW+now*.6*(1+hash(k,2)))%(S*GW),ry=(hash(k,3)*S*GH+now*.9)%(S*GH);ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx-3,ry+12);ctx.stroke();}}
  if(fire&&Math.random()<.6){const lit=[];grid.forEach((c,i)=>{if(c.lit)lit.push(i);});if(lit.length){const i=lit[Math.floor(Math.random()*lit.length)];g.particles.push({x:(i%GW+.5)*S,y:((i/GW|0)+.5)*S,r:S*.15,a:.55});}}
  const want=sn.creek>50?Math.round((sn.creek-40)/8):0;while(g.birds.length<want)g.birds.push({x:-20-Math.random()*200,y:Math.random()*S*GH*.5,v:.4+Math.random()*.5});if(g.birds.length>want)g.birds.length=want;
  ctx.strokeStyle='#1d2b22';ctx.lineWidth=1.6;g.birds.forEach((b,k)=>{b.x+=b.v;if(b.x>S*GW+20)b.x=-20;const f=Math.sin(now/120+k)*3;ctx.beginPath();ctx.moveTo(b.x-5,b.y+f*.3-2);ctx.lineTo(b.x,b.y);ctx.lineTo(b.x+5,b.y+f*.3-2);ctx.stroke();});}
 g.particles=g.particles.filter(p=>p.a>.02);g.particles.forEach(p=>{p.y-=.4;p.x+=.2;p.r+=.1;p.a*=.985;ctx.fillStyle=`rgba(120,110,100,${p.a})`;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();});
 if(sn?.quotes)drawBubbles(ctx,S,sn);
 ctx.restore();
}
function curSnap(g){if(g.phase==='plan')return null;const h=(g.showUntouched?g.res.untouchedRun:g.run).history;return h[Math.min(g.view,h.length-1)];}
function freshGame(level){return {level,base:level.build(),plan:{},run:null,res:null,view:0,phase:'plan',tool:'N',hover:-1,speed:1,paused:false,lastTick:0,replay:false,showUntouched:false,particles:[],birds:[],shake:0,S:40};}
const coinsLeft=g=>Object.entries(g.plan).reduce((c,[k,t])=>c-planCost(g.base[k].t,t),g.level.budget);

function Quiz({mode,onDone}){
 const [i,setI]=useState(0),[answers,setAnswers]=useState([]),[picked,setPicked]=useState(null);const q=QUIZ[i],post=mode==='post';
 function next(k){const a=[...answers,k];setAnswers(a);setPicked(null);if(i+1<QUIZ.length)setI(i+1);else onDone(a);}
 const state=k=>picked===null?'':k===q.answer?'right':k===picked?'wrong':'';
 return <section className="play-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-title"><p className="eyebrow">{post?'AFTER THE GAME':'BEFORE YOU PLAY'} · QUESTION {i+1} OF {QUIZ.length}</p><h2 id="quiz-title">{q.q}</h2>
  <div className="quiz-options">{q.options.map((o,k)=><button key={k} className={`quiz-option ${state(k)}`} disabled={picked!==null} onClick={()=>post?setPicked(k):next(k)}>{o}</button>)}</div>
  {picked!==null&&<><p className={`quiz-feedback ${picked===q.answer?'right':'wrong'}`} role="status"><strong>{picked===q.answer?'Correct.':'Not quite.'}</strong> {q.why}</p><button className="button" onClick={()=>next(picked)}>{i+1<QUIZ.length?'Next question':'See what happened'} <ArrowRight size={16}/></button></>}
  {!post&&<div className="quiz-foot"><span className="small muted">Just a warm-up. You’ll see the answers after the game.</span><button className="text-button muted" onClick={()=>onDone(null)}>Skip quiz</button></div>}
 </section>;
}
function Decision({run,onChoose}){
 const infill=decisionSpots(run,'infill').length;
 return <section className="play-modal" role="dialog" aria-modal="true" aria-labelledby="decision-title"><p className="eyebrow">YEAR {DECISION_YEAR} · A BIG DECISION</p><h2 id="decision-title">The neighborhood needs homes.</h2><p>Rents are rising and families are moving away. A builder offers to put up 6 new homes. Where should they go?</p>
  <div className="play-choices">
   <button className="play-choice" onClick={()=>onChoose('ridge')}><strong>On the open ridge</strong><span>Big views and quick to build, right next to dry grass.</span></button>
   <button className="play-choice" disabled={!infill} onClick={()=>onChoose('infill')}><strong>On parking lots in the flats</strong><span>{infill?`${Math.min(6,infill)} homes fit on lots that are already paved.`:'No parking lots are left. You turned them into something else.'}</span></button>
   <button className="play-choice" onClick={()=>onChoose('none')}><strong>Don’t build</strong><span>Keep the land as it is. Fewer families can stay.</span></button>
  </div></section>;
}
function EventMatches({events,error,cats}){
 if(error)return <p className="small muted">We couldn’t load events right now. <Link to="/" className="text-button">Browse the map <ArrowUpRight size={13}/></Link></p>;
 if(!events)return <p className="small muted">Finding events near you…</p>;
 const picks=matchEvents(events,cats);
 if(!picks.length)return <p className="small muted">No upcoming events yet. <Link to="/submit" className="text-button">Post one <ArrowUpRight size={13}/></Link></p>;
 return <div className="play-events">{picks.map(e=><Link key={e.id} to={`/events/${e.id}`} className="play-event"><span><span className="play-event-tags"><span className={`category ${categoryClass(e.category)}`}>{e.category}</span>{e.is_demo&&<span className="demo-label">DEMO</span>}</span><strong>{e.title}</strong><small><CalendarDays size={12}/> {fmt(e.starts_at,{weekday:'short',month:'short',day:'numeric'})} · <MapPin size={12}/> {e.city}</small></span><ArrowUpRight size={20}/></Link>)}</div>;
}
function EndScreen({res,pre,post,events,eventsError,onAgain,onReview,onNext,onClose}){
 const g=res.end,goals=res.untouched,lvl=res.level;
 return <section className="play-modal wide" role="dialog" aria-modal="true" aria-labelledby="end-title"><span className="play-badge">{res.badge}</span><h2 id="end-title">Year 20</h2>
  <div className="play-stars" aria-label={`${res.stars} of 3 stars`}>{[0,1,2].map(i=><span key={i} className={i<res.stars?'':'off'}>★</span>)}</div>
  <div className="play-scores">{GOALS.map(([k,label])=><div key={k} className={res.met[k]?'met':''}><span>{res.met[k]?'✓':'✗'} {label}</span><b>{Math.round(g[k])} <small>/ {lvl.goals[k]}</small></b></div>)}</div>
  <p className="small muted">Hit all four targets for 3 stars, three for 2. If nobody had changed anything: {GOALS.map(([k,l])=>`${l.toLowerCase()} ${Math.round(goals[k])}`).join(', ')}.</p>
  {post&&<div className="notice success">Quiz: {pre?<>you got <strong>{quizScore(pre)}/3</strong> before and <strong>{quizScore(post)}/3</strong> after.</>:<>you got <strong>{quizScore(post)}/3</strong>.</>}</div>}
  <h3>What happened</h3><ul className="play-why">{res.why.map(w=><li key={w.id}>{w.text}<small>{LESSONS[w.id].source}</small><span className="play-why-tags">{LESSONS[w.id].categories.map(c=><span key={c} className={`category ${categoryClass(c)}`}>{c}</span>)}</span></li>)}</ul>
  <p className="small muted"><Info size={13}/> These rules are simplified and illustrative. They show direction and rough size, not real predictions for any real creek.</p>
  <h3>Try it for real</h3><p className="small">Upcoming events on the map that match what you just learned:</p><EventMatches events={events} error={eventsError} cats={lessonCategories(res)}/>
  <div className="play-bar"><button className="button" onClick={onAgain}><RotateCcw size={16}/> Try a new plan</button><button className="button outline" onClick={onReview}>Rewatch the time-lapse</button>{onNext&&<button className="button outline" onClick={onNext}>Next level <ArrowRight size={16}/></button>}<button className="text-button" onClick={onClose}>Close and look around</button></div>
 </section>;
}

export default function Play(){
 const G=useRef(null);if(!G.current)G.current=freshGame(LEVELS[0]);
 const canvas=useRef(null),stage=useRef(null),cb=useRef({}),painting=useRef(-1);
 const [,force]=useState(0),rerender=()=>force(n=>n+1);
 const [overlay,setOverlay]=useState('intro'),[voices,setVoices]=useState([]),[hint,setHint]=useState('Tap or drag on the map to paint. Hover a plot to see what it is.');
 const [quiz,setQuiz]=useState({pre:null,post:null,done:false}),[events,setEvents]=useState(null),[eventsError,setEventsError]=useState(false);
 const g=G.current,sn=curSnap(g),level=g.level,L=LEVELS.indexOf(level);
 useEffect(()=>{document.title='Madrone Creek — East Bay Regeneration Map';return()=>{document.title='East Bay Regeneration Map — Good things grow nearby';};},[]);
 cb.current={
  year:s=>{setVoices(v=>[...s.quotes.map(q=>({year:s.year,text:q.text})).reverse(),...v]);rerender();},
  view:rerender,
  decision:()=>{setOverlay('decision');rerender();},
  finish:()=>{const res=results(g.run);res.level=level;g.res=res;rerender();
   if(!events)fetch('/api/events').then(r=>r.ok?r.json():Promise.reject()).then(d=>setEvents(d.events)).catch(()=>setEventsError(true));
   setTimeout(()=>setOverlay(quiz.done?'end':'postquiz'),900);}
 };
 useEffect(()=>{
  const ctx=canvas.current.getContext('2d');let raf;
  const resize=()=>{const dpr=Math.min(2,window.devicePixelRatio||1),S=Math.max(16,Math.floor(stage.current.clientWidth/GW));G.current.S=S;canvas.current.width=S*GW*dpr;canvas.current.height=S*GH*dpr;canvas.current.style.width=S*GW+'px';canvas.current.style.height=S*GH+'px';ctx.setTransform(dpr,0,0,dpr,0,0);};
  const ro=new ResizeObserver(resize);ro.observe(stage.current);resize();
  const loop=now=>{const g=G.current;
   if(g.phase==='play'&&!g.paused&&now-g.lastTick>=YEAR_MS/g.speed){g.lastTick=now;
    if(g.run.year===DECISION_YEAR&&g.run.decision===null){g.phase='decision';cb.current.decision();}
    else{const s=simYear(g.run);g.view=g.run.year;if(s.flooded||s.burned)g.shake=s.flooded?8:5;cb.current.year(s);if(g.run.year>=YEARS){g.phase='done';cb.current.finish();}}}
   if(g.replay&&g.phase==='done'&&now-g.lastTick>YEAR_MS/2){g.lastTick=now;g.view++;if(g.view>=YEARS){g.view=YEARS;g.replay=false;}cb.current.view();}
   draw(ctx,g,now);raf=requestAnimationFrame(loop);};
  raf=requestAnimationFrame(loop);return()=>{cancelAnimationFrame(raf);ro.disconnect();};
 },[]);
 const tileAt=e=>{const r=canvas.current.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/(r.width/GW)),y=Math.floor((e.clientY-r.top)/(r.height/GH));return x>=0&&x<GW&&y>=0&&y<GH?idx(x,y):-1;};
 function paint(i){
  if(g.phase!=='plan'||i<0)return;const o=g.base[i].t,cur=g.plan[i]??o;
  if(!canPaint(o,g.tool)){setHint(TIPS[o]&&(o==='H'||o==='R')?`Those are ${TILE_NAMES[o].toLowerCase()}: ${TIPS[o]}.`:`${TOOLS[g.tool].name} can’t go on ${TILE_NAMES[o].toLowerCase()}.`);return;}
  const nt=g.tool==='X'?o:tileFor(g.tool);if(nt===cur)return;
  if(coinsLeft(g)-(planCost(o,nt)-planCost(o,cur))<0){setHint('Not enough coins. New homes earn 1 coin each… but they add pavement.');return;}
  if(nt===o)delete g.plan[i];else g.plan[i]=nt;rerender();
 }
 // Fast drags skip tiles between pointer events, so paint every tile on the line between them.
 function stroke(a,b){const ax=a%GW,ay=(a/GW)|0,bx=b%GW,by=(b/GW)|0,n=Math.max(Math.abs(bx-ax),Math.abs(by-ay));for(let k=1;k<=n;k++)paint(idx(Math.round(ax+(bx-ax)*k/n),Math.round(ay+(by-ay)*k/n)));}
 function describe(i){if(g.phase!=='plan'||i<0)return;const o=g.base[i].t,t=g.plan[i]??o,x=i%GW,y=(i/GW)|0;setHint(`${TILE_NAMES[t]} · slope ${Math.round(slopeAt(x,y)*100)}%${t===o&&TIPS[o]?` · ${TIPS[o]}`:''}`);}
 function loadLevel(i){G.current=freshGame(LEVELS[i]);setVoices([]);setOverlay(null);rerender();}
 function toPlan(){Object.assign(g,{phase:'plan',run:null,res:null,view:0,replay:false,showUntouched:false});setVoices([]);rerender();}
 function start(){Object.assign(g,{run:newRun(level,{...g.plan}),res:null,view:0,phase:'play',paused:false,replay:false,lastTick:performance.now()});setVoices([]);rerender();}
 function choose(choice){const n=applyDecision(g.run,choice);const text={ridge:'Bulldozers on the ridge. New neighbors soon, right up against the grass.',infill:`${n} new homes on old parking lots. Walkable, and no new pavement.`,none:'No new homes. Our cousins moved to Tracy.'}[choice];
  setVoices(v=>[{year:DECISION_YEAR,text},...v]);g.phase='play';g.lastTick=performance.now();setOverlay(null);rerender();}
 const coins=coinsLeft(g),values=GOALS.map(([k,label,color])=>({k,label,color,v:sn?Math.round(sn[k]):null,t:level.goals[k]}));
 return <main className="play-page">
  <div className="play-head"><div><p className="eyebrow">A WATERSHED GAME · FICTIONAL EAST BAY HILLSIDE</p><h1>Twenty years on <em>Madrone Creek</em></h1></div>
   <div className="play-levels">{LEVELS.map((l,i)=><button key={l.name} className={i===L?'chip active':'chip'} onClick={()=>loadLevel(i)} aria-pressed={i===L}>Level {i+1}: {l.name}</button>)}</div></div>
  <div className="play-game"><div className="play-stagecol">
   <div className="play-stage" ref={stage}>
    <canvas ref={canvas} aria-label="Map of the Madrone Creek watershed. Paint land uses, then fast-forward 20 years." onPointerDown={e=>{canvas.current.setPointerCapture(e.pointerId);const i=tileAt(e);painting.current=i;paint(i);}} onPointerMove={e=>{const i=tileAt(e);g.hover=i;if(painting.current>=0&&i>=0&&i!==painting.current){stroke(painting.current,i);painting.current=i;}describe(i);}} onPointerUp={()=>{painting.current=-1;}} onPointerLeave={()=>{g.hover=-1;}}/>
    <div className="play-hud"><strong>{sn?`Year ${sn.year}`:'Plan'}</strong><span className={sn?.ev?.kind||''}>{sn?sn.year?sn.ev.label:'Today':'Paint your watershed'}</span></div>
    {g.showUntouched&&<div className="play-tag">If nobody changed anything</div>}
    <div className="play-compass">Ridge ↑ · Flats ↓</div>
   </div>
   {g.phase==='plan'?<>
    <div className="play-tools" role="toolbar" aria-label="Land use tools">{Object.entries(TOOLS).map(([k,t])=><button key={k} className="play-tool" aria-pressed={g.tool===k} onClick={()=>{g.tool=k;rerender();}}><span className="sw" style={{background:SWATCH[k]}}/><b>{t.name}</b><small>{t.desc}</small><span className="price">{k==='X'?'refund':t.cost<0?`earns ${-t.cost} coin`:`${t.cost} coin${t.cost>1?'s':''}`}</span></button>)}</div>
    <div className="play-bar"><div className="play-coins">Coins <b>{coins}</b></div><button className="button" onClick={start}><FastForward size={17}/> Fast-forward 20 years</button><button className="button outline" onClick={()=>{g.plan={};rerender();}}>Clear plan</button></div>
    <p className="play-hint" aria-live="polite">{hint}</p></>
   :<div className="play-bar">
    {g.phase!=='done'&&<><button className="button outline" onClick={()=>{g.paused=!g.paused;g.lastTick=performance.now();rerender();}}>{g.paused?<><PlayIcon size={15}/> Resume</>:<><Pause size={15}/> Pause</>}</button><button className="button outline" onClick={()=>{g.speed=g.speed===1?2:g.speed===2?4:1;rerender();}}>Speed {g.speed}×</button></>}
    <label className="play-scrub"><span>Yr 0</span><input type="range" min="0" max={YEARS} value={g.view} disabled={g.phase!=='done'} onChange={e=>{g.view=+e.target.value;g.replay=false;rerender();}} aria-label="Scrub through years"/><span>Yr 20</span></label>
    {g.phase==='done'&&<><button className="button outline" onClick={()=>{g.showUntouched=!g.showUntouched;rerender();}}>{g.showUntouched?'Show my watershed':'Show untouched watershed'}</button><button className="button outline" onClick={()=>setOverlay('end')}>Results</button><button className="button" onClick={toPlan}>Change my plan</button></>}
   </div>}
  </div>
  <aside className="play-side">
   <div className="play-card"><h2>{level.name}</h2><p className="small muted">{level.brief}</p>
    {values.map(({k,label,color,v,t})=><div key={k} className={`play-goal ${v!==null&&v>=t?'met':''}`}><div className="top"><span>{label}</span><b>{v===null?'–':v} / {t}</b></div><div className="play-meter"><i style={{width:`${v===null?0:clamp(v)}%`,background:color}}/><span className="tgt" style={{left:`${t}%`}}/></div></div>)}
    <p className="small muted">Meet all four targets in year 20 for 3 stars.</p></div>
   <div className="play-card"><h2>Neighbor voices</h2><ul className="play-voices">{voices.length?voices.slice(0,30).map((q,i)=><li key={voices.length-i}><small>YEAR {q.year}</small>“{q.text}”</li>):<li>Fast-forward to hear from the people who live here.</li>}</ul></div>
   <p className="play-note"><Info size={12}/> Madrone Creek is fictional. Its rules are simplified and illustrative, based on published sources (runoff: FISRWG 1998; soil loss: Universal Soil Loss Equation; fire fuel: CAL FIRE and East Bay Regional Park District grazing programs). They show direction and rough size, not predictions.</p>
  </aside></div>
  {overlay&&<div className="play-overlay">
   {overlay==='intro'&&<section className="play-modal" role="dialog" aria-modal="true" aria-labelledby="intro-title"><p className="eyebrow">TWENTY YEARS IN TWO MINUTES</p><h2 id="intro-title">Shape a hillside watershed.</h2><p>Madrone Creek runs from oak canyons and dry grass hills down into a pipe under a busy neighborhood. Paint native plants, oaks, goat grazing, community gardens and new homes. You can even dig the buried creek back out.</p><p>Then fast-forward. Atmospheric rivers, droughts and fire seasons are coming. Can you keep the neighborhood safe <strong>and</strong> bring the creek back to life?</p><button className="button" onClick={()=>setOverlay('prequiz')}>Start with 3 quick questions <ArrowRight size={16}/></button></section>}
   {overlay==='prequiz'&&<Quiz mode="pre" onDone={a=>{setQuiz(q=>({...q,pre:a}));setOverlay(null);}}/>}
   {overlay==='decision'&&g.run&&<Decision run={g.run} onChoose={choose}/>}
   {overlay==='postquiz'&&<Quiz mode="post" onDone={a=>{setQuiz(q=>({...q,post:a,done:true}));setOverlay('end');}}/>}
   {overlay==='end'&&g.res&&<EndScreen res={g.res} pre={quiz.pre} post={quiz.post} events={events} eventsError={eventsError}
     onAgain={()=>{setOverlay(null);toPlan();}} onReview={()=>{setOverlay(null);g.view=0;g.replay=true;g.lastTick=performance.now();rerender();}}
     onNext={L<LEVELS.length-1?()=>loadLevel(L+1):null} onClose={()=>setOverlay(null)}/>}
  </div>}
 </main>;
}
