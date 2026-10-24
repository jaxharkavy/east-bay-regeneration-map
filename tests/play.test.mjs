import test from 'node:test';
import assert from 'node:assert/strict';
import {categories} from '../server/validation.mjs';
import {demoEvents} from '../server/demo.mjs';
import {LEVELS,LESSONS,QUIZ,GW,YEARS,runAll,results,planCost,nbrs,lessonCategories,matchEvents,quizScore,decisionSpots,newRun} from '../src/play/watershed.mjs';
test('every game lesson maps to an existing event category',()=>{
 for(const lesson of Object.values(LESSONS)){assert.ok(lesson.categories.length);for(const c of lesson.categories)assert.ok(categories.includes(c),c);assert.ok(lesson.source.length>20);}
});
test('simulation is deterministic and doing nothing misses the goals',()=>{
 for(const level of LEVELS){const a=runAll(level,{},'none'),b=runAll(level,{},'none');assert.equal(a.history.length,YEARS+1);assert.deepEqual(a.history[YEARS].grid,b.history[YEARS].grid);assert.equal(results(a).stars,0);}
});
test('a thoughtful plan within budget earns 3 stars, and ridge sprawl costs fire safety',()=>{
 const level=LEVELS[0],base=level.build(),plan={},ids=t=>base.map((c,i)=>i).filter(i=>base[i].t===t),byPipe=i=>nbrs(i).some(j=>base[j].t==='P');
 ids('P').slice(0,2).forEach(i=>plan[i]='R');ids('L').filter(byPipe).slice(0,7).forEach(i=>plan[i]='N');ids('L').filter(i=>!byPipe(i)).slice(0,3).forEach(i=>plan[i]='C');
 ids('G').filter(i=>nbrs(i).some(j=>base[j].t==='H')).slice(0,8).forEach(i=>plan[i]='K');
 const cost=Object.entries(plan).reduce((a,[k,t])=>a+planCost(base[k].t,t),0);assert.ok(cost<=level.budget,`cost ${cost}`);
 const infill=results(runAll(level,plan,'infill')),ridge=results(runAll(level,plan,'ridge'));
 assert.equal(infill.stars,3);assert.ok(ridge.end.fire<infill.end.fire);
 assert.equal(decisionSpots(newRun(level,plan),'infill').length,6);assert.ok(decisionSpots(newRun(level,plan),'ridge').every(i=>(i/GW|0)<=2));
});
test('end screen suggests 2–3 upcoming events matching missed lessons first',()=>{
 const res=results(runAll(LEVELS[0],{},'none')),cats=lessonCategories(res),now=new Date('2026-10-24T12:00:00Z');
 assert.ok(cats.every(c=>categories.includes(c)));
 const picks=matchEvents(demoEvents,cats,now);assert.equal(picks.length,3);assert.equal(picks[0].category,cats[0]);assert.equal(new Set(picks.map(e=>e.id)).size,3);
 assert.equal(matchEvents([...demoEvents.map(e=>({...e,starts_at:'2020-01-01T00:00:00Z'}))],cats,now).length,0);
 assert.equal(matchEvents(demoEvents.map(e=>({...e,status:e.category===cats[0]?'cancelled':'published'})),cats,now).some(e=>e.status==='cancelled'),false);
});
test('quiz has three questions with valid answers',()=>{
 assert.equal(QUIZ.length,3);for(const q of QUIZ)assert.ok(q.answer>=0&&q.answer<q.options.length);
 assert.equal(quizScore(QUIZ.map(q=>q.answer)),3);assert.equal(quizScore([null,null,null]),0);
});
