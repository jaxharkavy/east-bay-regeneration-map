// Madrone Creek: a fictional East Bay hillside watershed. Every rule here is simplified and illustrative: it shows direction and rough size, not real predictions.
export const GW=16,GH=12,YEARS=20,FLATS=7;
export const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
export function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export const creekX=y=>8+Math.round(Math.sin(y*.5+.3)*1.3);
export const idx=(x,y)=>y*GW+x;
// Upper rows are steep hillside; rows from FLATS down are the flat, built-up neighborhood.
export const slopeAt=(x,y)=>Math.min(1,.08+(GH-1-y)/(GH-1)*.6+Math.abs(x-creekX(y))*.03);
export const isWater=t=>t==='R'||t==='P';
export function nbrs(i,reach=1){const x=i%GW,y=(i/GW)|0,o=[];for(let dy=-reach;dy<=reach;dy++)for(let dx=-reach;dx<=reach;dx++){if(!dx&&!dy)continue;if(reach===1&&dx&&dy)continue;const a=x+dx,b=y+dy;if(a>=0&&a<GW&&b>=0&&b<GH)o.push(idx(a,b));}return o;}
export const TILE_NAMES={O:'Oak woodland',G:'Dry annual grass',K:'Goat-grazed grass',N:'Native plants',C:'Community garden',H:'Homes & streets',L:'Parking lot',B:'Burned, bare slope',R:'Open creek',P:'Creek buried in a pipe'};
// inf: share of rain that soaks in (FISRWG 1998). fuel: how readily it carries fire. cover: USLE-style cover factor for soil loss (Wischmeier & Smith 1978).
const LAND={O:{inf:.9,fuel:.45,cover:.01},N:{inf:.85,fuel:.35,cover:.03},G:{inf:.55,fuel:1,cover:.08},K:{inf:.6,fuel:.3,cover:.12},C:{inf:.65,fuel:.1,cover:.2},B:{inf:.3,fuel:.05,cover:.6},H:{inf:.15,fuel:.2,cover:0},L:{inf:.05,fuel:0,cover:0}};
export function props(c){if(c.t==='O'&&c.age<5)return{inf:.65,fuel:.3,cover:.06};if(c.t==='N'&&c.age<2)return{inf:.6,fuel:.2,cover:.1};return LAND[c.t];}
export const TOOLS={
 N:{name:'Native plants',desc:'Rain gardens and creekside natives',cost:1,on:'GBL'},
 O:{name:'Plant oaks',desc:'Slow to grow, deep roots',cost:1,on:'GB'},
 K:{name:'Goat grazing',desc:'Goats eat dry grass fuel',cost:1,on:'GB'},
 C:{name:'Community garden',desc:'Food and neighbors',cost:1,on:'GBL'},
 D:{name:'Daylight creek',desc:'Open the buried pipe',cost:3,on:'P'},
 H:{name:'New homes',desc:'Housing, but more pavement',cost:-1,on:'GBL'},
 X:{name:'Undo plot',desc:'Back to how it was',cost:0,on:''}
};
export const tileFor=tool=>tool==='D'?'R':tool;
const toolFor=t=>t==='R'?'D':t;
export function planCost(orig,nt){return nt===orig?0:TOOLS[toolFor(nt)].cost;}
export const canPaint=(orig,tool)=>tool==='X'||TOOLS[tool].on.includes(orig);
const STORM=r=>({rain:r,label:'Atmospheric river',kind:'storm'}),DRY=r=>({rain:r,label:'Drought year',kind:'drought'}),FIRE={rain:.8,label:'Red-flag fire weather',kind:'fire'};
function evs(over){return Array.from({length:YEARS},(_,i)=>over[i+1]||{rain:1,label:'Normal year'});}
function makeGrid(f){const g=[];for(let y=0;y<GH;y++)for(let x=0;x<GW;x++)g.push({t:f(x,y,creekX(y)),age:6});return g;}
function hillside(x,y,cx){const d=x-cx,ad=Math.abs(d);
 if(!d)return y>=FLATS?'P':'R';
 if(y<=1)return ad<=2?'O':'G';
 if(y<=4)return ad<=3?'O':ad>=6&&y>=3?'H':'G';
 if(y<FLATS)return ad<=1?'O':ad<=4?'G':'H';
 return ad===1||(x*3+y)%7===0?'L':'H';}
export const LEVELS=[
 {name:'Madrone Creek',brief:'Oak canyons and dry grass hills drain into a creek that disappears into a pipe under the flats. Keep homes safe from floods and fire, and bring the creek back to life.',budget:24,goals:{flood:55,creek:75,fire:60,wellbeing:70},
  events:evs({3:FIRE,5:STORM(2.2),7:DRY(.5),9:FIRE,12:STORM(2.4),14:DRY(.45),15:FIRE,18:STORM(2.3)}),build:()=>makeGrid(hillside)},
 {name:'After the Fire',brief:'A wildfire burned the upper watershed last fall. Bare slopes are about to meet winter storms. Hold the soil, protect the flats, and help the hills recover.',budget:28,goals:{flood:55,creek:70,fire:60,wellbeing:65},
  events:evs({1:STORM(2.3),4:DRY(.5),6:FIRE,9:STORM(2.2),12:FIRE,15:STORM(2.4),17:DRY(.45),19:FIRE}),
  build:()=>makeGrid((x,y,cx)=>{const t=hillside(x,y,cx);if(y<FLATS&&(t==='G'||t==='O'))return t==='O'&&(x+y)%3?'O':'B';return t;})}
];
export const homesNeed=level=>level.build().filter(c=>c.t==='H').length+6;
// Water: runoff share minus what rain gardens in the flats and an opened creek floodplain can hold.
function hydro(g){let land=0,run=0,flatN=0,daylit=0,n=0;
 g.forEach((c,i)=>{const y=(i/GW)|0;if(c.t==='R'&&y>=FLATS)daylit++;if(isWater(c.t))return;land++;run+=1-props(c).inf;if(c.t==='N')y>=FLATS?flatN++:n++;});
 const gardens=g.filter(c=>c.t==='C').length;
 return {land,runoff:run/land,sev:run/land-(.01*flatN+.004*n+.02*daylit+.004*gardens),daylit};}
const near=(g,i,types,reach)=>nbrs(i,reach).some(j=>types.includes(g[j].t));
export function stats(st,ev,yr){
 const g=st.grid,n={};g.forEach(c=>{n[c.t]=(n[c.t]||0)+1;});const h=hydro(g);
 const flood=clamp(100*(.66-h.sev)/.36);
 let bank=0,good=0;g.forEach((c,i)=>{if(isWater(c.t)||!near(g,i,'RP',1))return;bank++;if((c.t==='O'||c.t==='N')&&props(c).inf>.8)good++;else if(c.t==='O'||c.t==='N'||c.t==='K')good+=.5;});
 const open=(n.R||0)/((n.R||0)+(n.P||0)),muddy=clamp(yr.sed/h.land*25),cover=((n.O||0)+(n.N||0))/h.land;
 const creek=clamp(100*(.3*good/bank+.4*open+.3*(1-muddy/100))-(ev.kind==='drought'?30*(1-cover):0));
 let fuel=0,edge=0;g.forEach((c,i)=>{if(isWater(c.t)||c.t==='H'||c.t==='L'||!near(g,i,'H',1))return;edge++;fuel+=props(c).fuel;});
 const fire=clamp(100*(1.05-(edge?fuel/edge:0))/.8);
 const homes=n.H||0,green=g.filter((c,i)=>c.t==='H'&&near(g,i,'ONR',2)).length;
 st.hurt=(st.hurt||0)*.5+3*(yr.flooded+yr.burnedHomes);
 const wellbeing=clamp(15+40*Math.min(1,homes/st.need)+Math.min(24,(n.C||0)*4)+20*(homes?green/homes:0)-st.hurt);
 return {flood,creek,fire,wellbeing,muddy,runoff:h.runoff,homes,n,daylit:h.daylit,...yr};
}
function snap(st,s,quotes){return {year:st.year,ev:st.year?st.level.events[st.year-1]:{rain:1,label:'Today'},grid:st.grid.map(c=>({t:c.t,age:c.age,lit:c.lit})),...s,quotes};}
export function newRun(level,plan){
 const g=level.build();for(const k in plan){g[k].t=plan[k];g[k].age=0;}
 const st={level,grid:g,year:0,rnd:mulberry(4242+LEVELS.indexOf(level)),history:[],decision:null,need:homesNeed(level),hurt:0};
 st.history.push(snap(st,stats(st,{rain:1},{sed:0,flooded:0,burnedHomes:0,burned:0}),[]));
 return st;
}
// A spark on the ridge spreads through connected fuel; homes next to burning, fuel-heavy land can catch embers.
function wildfire(st,dry){
 const g=st.grid,cand=[];g.forEach((c,i)=>{if((i/GW|0)<=2&&'GBOKN'.includes(c.t))cand.push(i);});
 if(!cand.length)return {burned:[],homes:[]};
 const start=cand[Math.floor(st.rnd()*cand.length)],seen=new Set([start]),queue=[start],homes=new Set();
 while(queue.length){const i=queue.shift(),fi=props(g[i]).fuel;
  for(const j of nbrs(i)){if(seen.has(j)||homes.has(j))continue;const c=g[j];if(isWater(c.t)||c.t==='L'||c.t==='C')continue;
   if(c.t==='H'){if(fi>=.45&&st.rnd()<.55*fi*dry)homes.add(j);continue;}
   if(st.rnd()<props(c).fuel*.8*dry*(fi+.3)/1.3){seen.add(j);queue.push(j);}}}
 const burned=[...seen];burned.forEach(i=>{const c=g[i];if(c.t!=='O'){c.t='B';c.age=0;}c.lit=1;});
 return {burned,homes:[...homes]};
}
export const SAY={
 flood:['Water was over the curb on our street again.','The culvert backed up into our garage.','Sandbags by the front door. Again.'],
 fire:['Red flag warning. We packed the car.','Embers landed on our roof last night.','The ridge glowed orange from my window.'],
 goats:['The goats cleared the slope behind our fence in a week!','Kids lined up to watch the goats eat.'],
 creek:['I saw a fish in the creek where the pipe used to be!','Kids are catching water striders in the creek.','We had lunch by the open creek today.'],
 mud:['The creek runs brown after every storm.','Mud from the hills is clogging the storm drains.'],
 dry:['The creek dried to puddles by July.','Even the oaks look thirsty this year.'],
 garden:['Tomatoes for the whole block!','I met three neighbors at the garden today.'],
 wild:['A red-tailed hawk over the oaks!','Quail in the native plants this morning.','Monarchs on the milkweed!'],
 good:['Quiet year. Picnic under the oaks.','Good year on the hill.']
};
const pick=(st,key)=>{const a=SAY[key];return a[Math.floor(st.rnd()*a.length)];};
export function simYear(st){
 st.year++;const ev=st.level.events[st.year-1],g=st.grid,prev=st.year>1?st.level.events[st.year-2]:{},q=[];
 g.forEach(c=>{c.lit=0;});
 let sed=0;g.forEach((c,i)=>{if(isWater(c.t))return;sed+=9*ev.rain*slopeAt(i%GW,(i/GW)|0)*props(c).cover;c.age++;});
 const before=g.map(c=>c.t);
 g.forEach((c,i)=>{if(c.t==='B'&&c.age>=1&&st.rnd()<.5){c.t='G';c.age=0;}else if(c.t==='G'&&nbrs(i).some(j=>before[j]==='O')&&st.rnd()<.04){c.t='O';c.age=0;}});
 let fire={burned:[],homes:[]};if(ev.kind==='fire')fire=wildfire(st,prev.kind==='drought'?1.2:1);
 const h=hydro(g),sevStorm=h.sev*ev.rain/2.2,flatHomes=g.filter((c,i)=>c.t==='H'&&(i/GW|0)>=FLATS).length;
 const flooded=ev.rain>1.5&&sevStorm>.44?Math.min(flatHomes,Math.round(flatHomes*(sevStorm-.44))):0;
 const s=stats(st,ev,{sed,flooded,burnedHomes:fire.homes.length,burned:fire.burned.length});
 const homeI=g.findIndex((c,i)=>c.t==='H'&&(i/GW|0)>=FLATS),creekI=idx(creekX(FLATS+1),FLATS+1),find=t=>g.findIndex(c=>c.t===t);
 if(flooded)q.push({i:homeI,text:pick(st,'flood')});
 if(fire.burned.length)q.push({i:fire.homes[0]??fire.burned[0],text:pick(st,'fire')});
 else if(ev.kind==='fire'&&find('K')>=0)q.push({i:find('K'),text:pick(st,'goats')});
 if(ev.kind==='drought'&&s.creek<50)q.push({i:creekI,text:pick(st,'dry')});
 else if(s.muddy>35)q.push({i:creekI,text:pick(st,'mud')});
 if(s.daylit&&st.year%4===2)q.push({i:g.findIndex((c,i)=>c.t==='R'&&(i/GW|0)>=FLATS),text:pick(st,'creek')});
 if(find('C')>=0&&st.year%5===3)q.push({i:find('C'),text:pick(st,'garden')});
 if(!ev.kind&&s.creek>65&&st.year%3===1)q.push({i:find('N')>=0?find('N'):find('O'),text:pick(st,'wild')});
 if(!q.length)q.push({i:homeI,text:pick(st,'good')});
 const sn=snap(st,s,q.slice(0,3));st.history.push(sn);return sn;
}
export const DECISION_YEAR=10;
// Year 10: the neighborhood needs more homes. Where they go matters.
export function decisionSpots(st,choice){const g=st.grid,spots=[];
 if(choice==='ridge')g.forEach((c,i)=>{const y=(i/GW)|0;if(y>=1&&y<=2&&'GKBN'.includes(c.t)&&Math.abs(i%GW-creekX(y))>=3)spots.push(i);});
 if(choice==='infill')g.forEach((c,i)=>{if(c.t==='L')spots.push(i);});
 return spots.slice(0,6);}
export function applyDecision(st,choice){st.decision=choice;const spots=decisionSpots(st,choice);spots.forEach(i=>{st.grid[i].t='H';st.grid[i].age=0;});st.decisionHomes=spots.length;return spots.length;}
export function runAll(level,plan,choice){const st=newRun(level,plan);while(st.year<YEARS){if(st.year===DECISION_YEAR&&st.decision===null)applyDecision(st,choice);simYear(st);}return st;}
export const GOALS=[['flood','Flood safety','#4f8fb0'],['creek','Creek health','#4f777b'],['fire','Fire safety','#b5683a'],['wellbeing','Community well-being','#587149']];
// Each lesson maps to the map's event categories (server/validation.mjs) so the end screen can suggest real ways to act.
export const LESSONS={
 runoff:{categories:['Nature & restoration'],source:'Runoff shares follow the Federal Interagency Stream Restoration Working Group, Stream Corridor Restoration (1998): paved neighborhoods shed several times more rain than natural cover. Rain gardens: US EPA green infrastructure guidance.'},
 creek:{categories:['Nature & restoration'],source:'Daylighting opens a creek buried in a culvert. Berkeley daylighted Strawberry Creek in 1984 and Blackberry Creek in 1995 (Pinkham, Daylighting: New Life for Buried Streams, Rocky Mountain Institute, 2000).'},
 fire:{categories:['Community care','Nature & restoration'],source:'Dry annual grass carries fire fastest. East Bay parks and cities graze goats on hillsides to reduce fuel near homes (East Bay Regional Park District vegetation management; CAL FIRE defensible space). The 1991 Oakland Hills fire destroyed thousands of homes.'},
 soil:{categories:['Nature & restoration'],source:'Soil loss follows the Universal Soil Loss Equation (Wischmeier & Smith, USDA Handbook 537, 1978): bare, steep slopes in heavy rain lose the most.'},
 garden:{categories:['Gardens & growing','Food & sharing'],source:'Community gardeners report eating more fruit and vegetables and knowing more neighbors (Alaimo et al., Journal of Nutrition Education and Behavior, 2008).'},
 homes:{categories:['Community care'],source:'Building where homes meet wildland fuel (the wildland-urban interface) raises fire risk (Radeloff et al., PNAS, 2018). Infill on already-paved land adds homes without new pavement or fire exposure.'},
 learn:{categories:['Learning & making'],source:'Want to go deeper? Workshops and skill shares are a good next step.'}
};
export function results(run){
 const h=run.history,end=h[YEARS],g=run.level.goals,base=run.level.build();
 const met=Object.fromEntries(GOALS.map(([k])=>[k,end[k]>=g[k]])),count=Object.values(met).filter(Boolean).length;
 const stars=count===4?3:count===3?2:count===2?1:0,worst=GOALS.map(([k])=>k).sort((a,b)=>end[a]/g[a]-end[b]/g[b])[0];
 const badge=count===4?'Watershed Steward':count===3?'Almost There':{flood:'Storm Drain Blues',creek:'Creek in a Pipe',fire:'Tinderbox Ridge',wellbeing:'Lonely Hillside'}[worst];
 const sum=k=>h.reduce((a,s)=>a+(s[k]||0),0),fires=h.filter(s=>s.burned).length,buried=base.filter(c=>c.t==='P').length;
 const why=[];
 why.push({id:'runoff',goal:'flood',text:`Rain soaked into ${Math.round((1-end.runoff)*100)}% of the land. Storms flooded ${sum('flooded')} home${sum('flooded')===1?'':'s'} in the flats over 20 years.`});
 why.push({id:'creek',goal:'creek',text:end.daylit?`You opened ${end.daylit} of ${buried} buried creek blocks. Creek health ended at ${Math.round(end.creek)}.`:`The creek stayed in its pipe under the flats. Creek health ended at ${Math.round(end.creek)}.`});
 why.push({id:'fire',goal:'fire',text:fires?`${fires} fire season${fires>1?'s':''} burned ${sum('burned')} hillside plots and reached ${sum('burnedHomes')} home${sum('burnedHomes')===1?'':'s'}.`:'No fire spread this time, but the hills dry out every summer.'});
 const muddiest=h.reduce((a,s)=>s.muddy>a.muddy?s:a,h[0]);if(muddiest.muddy>30)why.push({id:'soil',goal:'creek',text:`In year ${muddiest.year} mud from bare slopes turned the creek brown.`});
 why.push({id:'garden',goal:'wellbeing',text:end.n.C?`${end.n.C} community garden plot${end.n.C>1?'s':''} fed neighbors and brought them together.`:'Nobody started a community garden.'});
 why.push({id:'homes',goal:'wellbeing',text:run.decision==='ridge'?`You built ${run.decisionHomes} homes on the ridge, right next to dry grass.`:run.decision==='infill'?`You built ${run.decisionHomes} homes on old parking lots in the flats.`:'You turned down new homes, so fewer families could live here.'});
 const untouchedRun=runAll(run.level,{},'none');
 return {end,met,count,stars,badge,why,untouched:untouchedRun.history[YEARS],untouchedRun};
}
// Lessons for goals the player missed come first, so suggestions point at what to try next.
export function lessonCategories(res){const order=[...res.why].sort((a,b)=>res.met[a.goal]-res.met[b.goal]);const cats=[];for(const w of order)for(const c of LESSONS[w.id].categories)if(!cats.includes(c))cats.push(c);for(const c of LESSONS.learn.categories)if(!cats.includes(c))cats.push(c);return cats;}
export function matchEvents(events,cats,now=new Date(),n=3){
 const upcoming=events.filter(e=>e.status!=='cancelled'&&new Date(e.starts_at)>now).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)),picked=[];
 for(const c of cats){const e=upcoming.find(e=>e.category===c&&!picked.includes(e));if(e)picked.push(e);if(picked.length>=n)break;}
 for(const e of upcoming){if(picked.length>=Math.min(2,n))break;if(!picked.includes(e))picked.push(e);}
 return picked.slice(0,n);
}
export const QUIZ=[
 {q:'During a big storm, which of these soaks up the most rain?',options:['A parking lot','Oak woodland','A rooftop','A burned, bare slope'],answer:1,why:'Leaf litter, loose soil and deep roots let rain soak in. Pavement and roofs shed it all at once.'},
 {q:'What does it mean to “daylight” a creek?',options:['Add streetlights along it','Drain it for the summer','Open up a creek that was buried in a pipe','Cut the trees that shade it'],answer:2,why:'Many East Bay creeks were put in culverts under streets. Daylighting brings them back to the surface, with room to spread out in storms.'},
 {q:'Why do East Bay parks bring in goat herds before summer?',options:['To eat dry grass and brush that could fuel wildfires','To make cheese for the farmers market','To fertilize lawns','To keep deer away'],answer:0,why:'Goats graze firebreaks on steep slopes where mowers can’t go. Less dry fuel means a fire near homes moves slower.'}
];
export const quizScore=answers=>QUIZ.reduce((a,q,i)=>a+(answers[i]===q.answer),0);
